import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Step 1: Get stored refresh token ─────────────────────────────────────
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("google_refresh_token, google_access_token")
      .eq("id", user_id)
      .maybeSingle();

    if (profileErr || !profile?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: "No Google credentials found for user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Get fresh access token using refresh token ───────────────────
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: profile.google_refresh_token,
        grant_type:    "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token refresh failed:", tokenData);
      return new Response(
        JSON.stringify({ error: "Failed to refresh access token", detail: tokenData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const access_token = tokenData.access_token;

    // Save the new access token
    await supabase
      .from("profiles")
      .update({ google_access_token: access_token })
      .eq("id", user_id);

    // ── Step 3: Fetch next 60 days of calendar events ────────────────────────
    const now    = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 60);

    const calendarUrl = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    calendarUrl.searchParams.set("timeMin",      now.toISOString());
    calendarUrl.searchParams.set("timeMax",      future.toISOString());
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy",      "startTime");
    calendarUrl.searchParams.set("maxResults",   "250");

    const calRes = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const calData = await calRes.json();

    if (!calRes.ok) {
      console.error("Calendar fetch failed:", calData);
      return new Response(
        JSON.stringify({ error: "Failed to fetch calendar events", detail: calData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const events = calData.items ?? [];

    // ── Step 4: Delete existing future events for this user ──────────────────
    // Only delete events from today onwards so past events with phone numbers are preserved
    await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", user_id)
      .gte("start_time", now.toISOString());

    // ── Step 5: Insert fresh events ──────────────────────────────────────────
    const rows = events
      .filter((e: any) => e.start?.dateTime || e.start?.date)
      .map((e: any) => ({
        user_id,
        external_id: e.id,
        title:       e.summary ?? "Appointment",
        start_time:  e.start.dateTime ?? e.start.date,
        end_time:    e.end?.dateTime  ?? e.end?.date ?? e.start.dateTime ?? e.start.date,
        location:    e.location ?? null,
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("calendar_events")
        .insert(rows);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to insert events", detail: insertError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, events_synced: rows.length, synced_at: now.toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
