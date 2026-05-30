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

  // TextReminder's own Twilio credentials — shared for all users
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
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
        const attendees: { name?: string; email?: string; phone?: string }[] =
          event.attendees ?? [];

        // Also try to extract phone number from event title
        const phoneFromTitle = event.title?.match(/(\+44\d{10}|07\d{9})/)?.[0];

        const targets = attendees.length > 0 ? attendees : (phoneFromTitle ? [{ phone: phoneFromTitle }] : []);

        for (const attendee of targets) {
          const phone = attendee.phone ?? phoneFromTitle;
          if (!phone) continue;

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

          // Normalise to E.164
          const toNumber = phone.startsWith("+") ? phone : phone.replace(/^0/, "+44");

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

          const body = new URLSearchParams({
            From: TWILIO_PHONE_NUMBER,
            To: toNumber,
            Body: message,
          });

          let status = "sent";
          let twilioSid = null;
          let errorMessage = null;

          try {
            const twilioRes = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: body.toString(),
            });

            const twilioData = await twilioRes.json();

            if (!twilioRes.ok) {
              status = "failed";
              errorMessage = twilioData.message ?? "Twilio error";
              errors.push(`Event ${event.id}: ${errorMessage}`);
            } else {
              twilioSid = twilioData.sid;
              results.push({ event: event.id, phone: toNumber, sid: twilioSid });
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
            twilio_sid: twilioSid,
            error_message: errorMessage,
          });

          if (status === "sent") {
            await supabase
              .from("calendar_events")
              .update({ reminder_sent: true })
              .eq("id", event.id);
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ sent: results.length, errors, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
