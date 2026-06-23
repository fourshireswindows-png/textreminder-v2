import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const created: object[] = [];
  const errors: string[] = [];

  console.log(`[extend-recurring] Running at ${now.toISOString()}`);

  // Find all recurring groups — get the latest occurrence per group
  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("recurring_group_id, recurring_interval_days, recurring_end_type, start_time, end_time, title, phone, phones, attendees, user_id, location")
    .not("recurring_group_id", "is", null)
    .not("recurring_interval_days", "is", null)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[extend-recurring] Query failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by recurring_group_id, keep only the latest occurrence per group
  const groupMap = new Map<string, typeof events[0]>();
  for (const ev of events ?? []) {
    if (!ev.recurring_group_id) continue;
    if (!groupMap.has(ev.recurring_group_id)) {
      groupMap.set(ev.recurring_group_id, ev); // already sorted desc so first = latest
    }
  }

  console.log(`[extend-recurring] Found ${groupMap.size} recurring group(s)`);

  const EXTEND_WINDOW_DAYS = 60; // create occurrences up to 60 days ahead of the last one

  for (const [groupId, latest] of groupMap) {
    const latestStart = new Date(latest.start_time);
    const intervalDays = latest.recurring_interval_days!;
    const endType = latest.recurring_end_type;

    // Only extend if the latest occurrence is within 30 days from now
    const daysUntilLatest = (latestStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilLatest > 30) {
      console.log(`[extend-recurring] Group ${groupId}: latest is ${Math.round(daysUntilLatest)}d away, skipping`);
      continue;
    }

    if (endType === 'date') {
      console.log(`[extend-recurring] Group ${groupId}: has fixed end date, skipping`);
      continue; // fixed end date — don't auto-extend
    }

    // Create new occurrences from latest + interval up to EXTEND_WINDOW_DAYS ahead of latest
    const cutoff = new Date(latestStart.getTime() + EXTEND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const dur = latest.end_time
      ? new Date(latest.end_time).getTime() - latestStart.getTime()
      : 3600000;

    const toInsert: object[] = [];
    let cur = new Date(latestStart);
    cur.setDate(cur.getDate() + intervalDays);

    while (cur <= cutoff) {
      const cEnd = new Date(cur.getTime() + dur);
      toInsert.push({
        user_id: latest.user_id,
        external_id: "manual-" + crypto.randomUUID(),
        title: latest.title,
        start_time: cur.toISOString(),
        end_time: cEnd.toISOString(),
        phone: latest.phone ?? null,
        phones: latest.phones ?? null,
        attendees: latest.attendees ?? null,
        location: latest.location ?? "",
        reminder_sent: false,
        recurring_group_id: groupId,
        recurring_interval_days: intervalDays,
        recurring_end_type: endType,
      });
      cur = new Date(cur);
      cur.setDate(cur.getDate() + intervalDays);
    }

    if (toInsert.length === 0) {
      console.log(`[extend-recurring] Group ${groupId}: nothing to add`);
      continue;
    }

    const { error: insertError } = await supabase
      .from("calendar_events")
      .insert(toInsert);

    if (insertError) {
      console.error(`[extend-recurring] Group ${groupId} insert failed:`, insertError.message);
      errors.push(`${groupId}: ${insertError.message}`);
    } else {
      console.log(`[extend-recurring] Group ${groupId}: created ${toInsert.length} new occurrence(s)`);
      created.push({ group: groupId, count: toInsert.length });
    }
  }

  return new Response(
    JSON.stringify({ groups_checked: groupMap.size, created, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
