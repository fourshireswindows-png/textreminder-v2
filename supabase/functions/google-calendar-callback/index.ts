import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { code, user_id } = await req.json();

    if (!code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing code or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read environment variables
    const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const GOOGLE_REDIRECT_URI  = Deno.env.get("GOOGLE_REDIRECT_URI")!;
    const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Log what we're sending so we can debug
    console.log("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID);
    console.log("GOOGLE_REDIRECT_URI:", JSON.stringify(GOOGLE_REDIRECT_URI));
    console.log("code length:", code?.length);
    console.log("user_id:", user_id);

    // ── Step 1: Exchange code for tokens ──────────────────────────────
    let tokenData: any;
    const tokenParams = new URLSearchParams({
      code,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri:  GOOGLE_REDIRECT_URI,
      grant_type:    "authorization_code",
    });
    console.log("Token params redirect_uri:", tokenParams.get("redirect_uri"));
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
      });
      tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        return new Response(
          JSON.stringify({ error: "Failed to exchange code for tokens", detail: tokenData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchErr) {
      console.error("Token fetch threw:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Network error during token exchange", detail: String(fetchErr) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { access_token, refresh_token: new_refresh_token } = tokenData;

    // ── Step 2: Save tokens to Supabase profiles ──────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Read existing refresh token (use maybeSingle so missing row doesn't crash)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("id", user_id)
      .maybeSingle();

    const refresh_token_to_save = new_refresh_token
      ? new_refresh_token
      : existingProfile?.google_refresh_token ?? null;

    // Upsert so it works whether or not the profile row already exists
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id:                   user_id,
        google_access_token:  access_token,
        google_refresh_token: refresh_token_to_save,
        calendar_provider:    "google",
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to save tokens", detail: profileError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Fetch next 30 days of calendar events ─────────────────
    const now       = new Date();
    const future    = new Date();
    future.setDate(future.getDate() + 30);

    const calendarUrl = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    calendarUrl.searchParams.set("timeMin",      now.toISOString());
    calendarUrl.searchParams.set("timeMax",      future.toISOString());
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy",      "startTime");
    calendarUrl.searchParams.set("maxResults",   "250");

    let calData: any;
    try {
      const calRes = await fetch(calendarUrl.toString(), {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      calData = await calRes.json();
      if (!calRes.ok) {
        console.error("Calendar fetch failed:", calData);
        return new Response(
          JSON.stringify({ error: "Failed to fetch calendar events", detail: calData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (calFetchErr) {
      console.error("Calendar fetch threw:", calFetchErr);
      return new Response(
        JSON.stringify({ error: "Network error fetching calendar events", detail: String(calFetchErr) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const events = calData.items ?? [];

    // ── Step 4: Delete existing events for this user ──────────────────
    const { error: deleteError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to clear old events", detail: deleteError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: Insert new events ─────────────────────────────────────
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

    // ── Success ───────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        events_imported: rows.length,
      }),
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
