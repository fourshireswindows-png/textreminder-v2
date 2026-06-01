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

  // The SMS Works credentials
  const SMS_WORKS_JWT = Deno.env.get("SMS_WORKS_JWT");
  const SMS_WORKS_SENDER = Deno.env.get("SMS_WORKS_SENDER") ?? "TextRemind";

  if (!SMS_WORKS_JWT) {
    return new Response(JSON.stringify({ error: "SMS Works credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const results: object[] = [];
  const errors: string[] = [];

  // Get all active profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*");

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const profile of profiles ?? []) {
    const reminderSchedule: { value: number; unit: string }[] =
      profile.reminder_schedule ?? [{ value: 24, unit: "hours" }];

    for (const schedule of reminderSchedule) {
      let offsetMs = 0;
      if (schedule.unit === "hours") offsetMs = schedule.value * 60 * 60 * 1000;
      else if (schedule.unit === "days") offsetMs = schedule.value * 24 * 60 * 60 * 1000;
      else if (schedule.unit === "weeks") offsetMs = schedule.value * 7 * 24 * 60 * 60 * 1000;

      // Window: events starting within ±30 minutes of the target time
      const windowStart = new Date(now.getTime() + offsetMs - 30 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + offsetMs + 30 * 60 * 1000);

      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", profile.id)
        .eq("reminder_sent", false)
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString());

      for (const event of events ?? []) {
        // Phone number priority: 1) phone column set in app, 2) attendees, 3) number in title
        const phoneFromTitle = event.title?.match(/(\+44\d{10}|07\d{9})/)?.[0];
        const attendees: { name?: string; email?: string; phone?: string }[] =
          event.attendees ?? [];

        // Get the phone number — prefer the phone column saved directly in the app
        const phone = event.phone
          ?? (attendees.length > 0 ? attendees[0].phone : null)
          ?? phoneFromTitle;

        if (!phone) continue;

        const attendee = attendees[0] ?? {};

        // Wrap in a single-iteration block
        for (const _ of [1]) {

          const appointmentTime = new Date(event.start_time);
          const timeStr = appointmentTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/London",
          });
          const dateStr = appointmentTime.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/London",
          });

          const template = profile.message_template
            ?? "Hi {name}, just a reminder your appointment is on {date} at {time}. Any questions call {business_phone}. Reply STOP to opt out.";

          const message = template
            .replace("{name}", attendee.name ?? "there")
            .replace("{time}", timeStr)
            .replace("{date}", dateStr)
            .replace("{business_phone}", profile.phone ?? "")
            .replace("{business_name}", profile.business_name ?? "");

          // Normalise to E.164 for UK numbers
          const toNumber = phone.startsWith("+") ? phone : phone.replace(/^0/, "+44");

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
              errors.push(`Event ${event.id}: ${errorMessage}`);
            } else {
              messageSid = smsData.messageid ?? smsData.messageId ?? null;
              results.push({ event: event.id, phone: toNumber, messageid: messageSid });
            }
          } catch (e) {
            status = "failed";
            errorMessage = String(e);
            errors.push(`Event ${event.id}: ${errorMessage}`);
          }

          // Log to reminders table
          await supabase.from("reminders").insert({
            user_id: profile.id,
            contact_name: attendee.name ?? event.title ?? "Unknown",
            contact_phone: toNumber,
            appointment_time: event.start_time,
            channel: "sms",
            message,
            status,
            sent_at: status === "sent" ? now.toISOString() : null,
            calendar_event_id: event.external_id,
            twilio_sid: messageSid, // reusing column for message ID
            error_message: errorMessage,
          });

          if (status === "sent") {
            await supabase
              .from("calendar_events")
              .update({ reminder_sent: true })
              .eq("id", event.id);
          }
        } // end single-iteration block
      }
    }
  }

  return new Response(
    JSON.stringify({ sent: results.length, errors, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
