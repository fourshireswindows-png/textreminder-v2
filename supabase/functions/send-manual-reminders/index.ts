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

  const SMS_WORKS_JWT = Deno.env.get("SMS_WORKS_JWT");
  const SMS_WORKS_SENDER = Deno.env.get("SMS_WORKS_SENDER") ?? "TextRemind";

  if (!SMS_WORKS_JWT) {
    console.error("[manual-reminders] SMS_WORKS_JWT not configured");
    return new Response(JSON.stringify({ error: "SMS Works credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const results: object[] = [];
  const errors: string[] = [];
  const skipped: object[] = [];

  // 24 hours ahead, ±1 hour window (same as existing cron)
  const offsetMs = 24 * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() + offsetMs - 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + offsetMs + 60 * 60 * 1000);

  console.log(`[manual-reminders] Running at ${now.toISOString()}`);
  console.log(`[manual-reminders] Window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`);

  // Query manual appointments only — no dependency on profiles table
  const { data: events, error: eventsError } = await supabase
    .from("calendar_events")
    .select("*")
    .like("external_id", "manual-%")
    .eq("reminder_sent", false)
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (eventsError) {
    console.error("[manual-reminders] DB query failed:", eventsError.message);
    return new Response(JSON.stringify({ error: eventsError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[manual-reminders] Found ${events?.length ?? 0} manual appointment(s) due`);

  // Cache settings per user to avoid repeated DB calls
  const settingsCache: Record<string, { message_template?: string; business_name?: string; phone_number?: string } | null> = {};

  for (const event of events ?? []) {

    // Resolve phone number
    const phoneFromTitle = event.title?.match(/(\+44\d{10}|07\d{9})/)?.[0];
    const attendees: { name?: string; phone?: string }[] = event.attendees ?? [];
    const rawPhone = event.phone
      ?? (attendees.length > 0 ? attendees[0].phone : null)
      ?? phoneFromTitle;

    if (!rawPhone) {
      console.warn(`[manual-reminders] SKIPPED event ${event.id} (${event.title}) — no phone number`);
      skipped.push({ event: event.id, title: event.title, reason: "no phone number" });
      continue;
    }

    // Mark sent before sending to prevent duplicate sends on retry
    await supabase
      .from("calendar_events")
      .update({ reminder_sent: true })
      .eq("id", event.id);

    // Load settings for this user (cached)
    if (!(event.user_id in settingsCache)) {
      const { data } = await supabase
        .from("settings")
        .select("message_template, business_name, phone_number")
        .eq("user_id", event.user_id)
        .maybeSingle();
      settingsCache[event.user_id] = data;
      console.log(`[manual-reminders] Loaded settings for user ${event.user_id}: business="${data?.business_name}"`);
    }
    const settingsRow = settingsCache[event.user_id];

    const phoneList = rawPhone.split(",").map((p: string) => p.trim()).filter(Boolean);

    for (const phone of phoneList) {

      const attendee = attendees[0] ?? {};
      const appointmentTime = new Date(event.start_time);
      const timeStr = appointmentTime.toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
      });
      const dateStr = appointmentTime.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London",
      });

      const template = settingsRow?.message_template
        ?? "Hi {name}, just a reminder your appointment is on {date} at {time}. Any questions call {business_phone}. Reply STOP to opt out.";

      const businessName = settingsRow?.business_name ?? "";
      const businessPhone = settingsRow?.phone_number ?? "";
      const message = template
        .replace("{name}",           attendee.name ?? "there")
        .replace("{time}",           timeStr)
        .replace("{date}",           dateStr)
        .replace("{business_phone}", businessPhone)
        .replace("{business_name}",  businessName)
        .replace("{business}",       businessName)
        .replace("{phone}",          businessPhone);

      const toNumber = phone.startsWith("+") ? phone : phone.replace(/^0/, "+44");

      console.log(`[manual-reminders] Sending to ${toNumber} for event "${event.title}" at ${event.start_time}`);

      let status = "sent";
      let messageSid: string | null = null;
      let errorMessage: string | null = null;

      try {
        const smsRes = await fetch("https://api.thesmsworks.co.uk/v1/message/send", {
          method: "POST",
          headers: {
            "Authorization": `JWT ${SMS_WORKS_JWT}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: SMS_WORKS_SENDER,
            destination: toNumber,
            content: message,
            schedule: "",
          }),
        });

        const smsData = await smsRes.json();

        if (!smsRes.ok || smsData.status === "REJECTED" || smsData.status === "FAILED") {
          status = "failed";
          errorMessage = smsData.message ?? smsData.error ?? "SMS Works error";
          console.error(`[manual-reminders] SMS FAILED for ${toNumber}: ${errorMessage}`);
          errors.push(`Event ${event.id} → ${toNumber}: ${errorMessage}`);
        } else {
          messageSid = smsData.messageid ?? smsData.messageId ?? null;
          console.log(`[manual-reminders] SMS SENT to ${toNumber}, messageId=${messageSid}`);
          results.push({ event: event.id, title: event.title, phone: toNumber, messageid: messageSid });
        }
      } catch (e) {
        status = "failed";
        errorMessage = String(e);
        console.error(`[manual-reminders] Exception sending to ${toNumber}:`, e);
        errors.push(`Event ${event.id} → ${toNumber}: ${errorMessage}`);
      }

      // Log to reminders table
      await supabase.from("reminders").insert({
        user_id:           event.user_id,
        contact_name:      attendee.name ?? event.title ?? "Unknown",
        contact_phone:     toNumber,
        channel:           "sms",
        message,
        status,
        sent_at:           status === "sent" ? now.toISOString() : null,
        calendar_event_id: event.external_id,
        twilio_sid:        messageSid,
        error_message:     errorMessage,
      });

    } // end for phoneList
  }

  const summary = { sent: results.length, skipped: skipped.length, errors: errors.length, results, skipped, errors };
  console.log(`[manual-reminders] Done — sent=${results.length} skipped=${skipped.length} errors=${errors.length}`);

  return new Response(
    JSON.stringify(summary),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
