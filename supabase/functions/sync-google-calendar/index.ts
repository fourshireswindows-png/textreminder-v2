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
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get refresh token
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("id", user_id)
      .single();

    if (!profile?.google_refresh_token) {
      return new Response(JSON.stringify({ error: "No Google credentials" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get fresh access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: profile.google_refresh_token,
        grant_type:    "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: "Token refresh failed", detail: tokenData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch next 60 days of calendar events
    const now    = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 60);

    const calUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calUrl.searchParams.set("timeMin",      now.toISOString());
    calUrl.searchParams.set("timeMax",      future.toISOString());
    calUrl.searchParams.set("singleEvents", "true");
    calUrl.searchParams.set("orderBy",      "startTime");
    calUrl.searchParams.set("maxResults",   "250");

    const calRes  = await fetch(calUrl.toString(), {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const calData = await calRes.json();

    if (!calRes.ok) {
      return new Response(JSON.stringify({ error: "Calendar fetch failed", detail: calData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const events = (calData.items ?? []).filter((e: any) => e.start?.dateTime || e.start?.date);

    // Get existing events to preserve phone numbers and reminder_sent status
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("external_id, start_time, reminder_sent, phone")
      .eq("user_id", user_id);

    const existingMap = new Map((existing ?? []).map((e: any) => [e.external_id, e]));

    // Build rows to upsert
    const rows = events.map((e: any) => {
      const startTime = e.start.dateTime ?? e.start.date;
      const prev      = existingMap.get(e.id);
      return {
        user_id,
        external_id:   e.id,
        title:         e.summary ?? "Appointment",
        start_time:    startTime,
        end_time:      e.end?.dateTime ?? e.end?.date ?? startTime,
        location:      e.location ?? null,
        reminder_sent: prev && prev.start_time === startTime ? prev.reminder_sent : false,
        phone:         prev?.phone ?? null,
        last_synced:   now.toISOString(),
      };
    });

    if (rows.length > 0) {
      await supabase
        .from("calendar_events")
        .upsert(rows, { onConflict: "user_id,external_id" });
    }

    // Remove events no longer in Google Calendar
    const ids = rows.map((r: any) => r.external_id);
    if (ids.length > 0) {
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", user_id)
        .gte("start_time", now.toISOString())
        .not("external_id", "in", `(${ids.map((id: string) => `"${id}"`).join(",")})`);
    }

    return new Response(
      JSON.stringify({ success: true, events_synced: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
