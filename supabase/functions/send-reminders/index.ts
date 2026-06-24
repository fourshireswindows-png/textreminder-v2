import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, number> = {
  trial:        20,
  starter:      100,
  professional: 200,
  business:     400,
  enterprise:   2000,
};

const DEFAULT_TEMPLATE_BODY =
  "Hi {name}, just a reminder your appointment is tomorrow at {time}. Any questions call {business_phone}. Reply STOP to opt out.";

const DEFAULT_TEMPLATES = [
  { id: 1, name: "Appointment Reminder", body: DEFAULT_TEMPLATE_BODY },
  { id: 2, name: "Day-of Reminder",      body: "Hi {name}, your appointment is today at {time}. See you then! Call {business_phone} if needed. Reply STOP to opt out." },
  { id: 3, name: "Quick Reminder",       body: "Hi {name}, reminder: appointment at {time}. Call {business_phone} to reschedule. Reply STOP to opt out." },
];

function offsetToMs(value: number, unit: string): number {
  if (unit === "weeks") return value * 7 * 24 * 60 * 60 * 1000;
  if (unit === "days")  return value * 24 * 60 * 60 * 1000;
  return value * 60 * 60 * 1000; // hours (default)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SMS_WORKS_JWT    = Deno.env.get("SMS_WORKS_JWT");
  const SMS_WORKS_SENDER = Deno.env.get("SMS_WORKS_SENDER") ?? "TextRemind";

  if (!SMS_WORKS_JWT) {
    return new Response(JSON.stringify({ error: "SMS Works credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const results: object[] = [];
  const errors: string[]  = [];

  // Fetch all profiles
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
    // Read reminder schedule — fall back to single 24hr entry
    const schedule: { value: number; unit: string; template_id: number }[] =
      profile.reminder_schedule?.length
        ? profile.reminder_schedule
        : [{ value: 24, unit: "hours", template_id: 1 }];

    const templates: { id: number; name: string; body: string }[] =
      profile.message_templates?.length ? profile.message_templates : DEFAULT_TEMPLATES;

    // Fetch business details from settings
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("business_name, phone_number")
      .eq("user_id", profile.id)
      .maybeSingle();

    const businessName  = settingsRow?.business_name ?? profile.business_name ?? "";
    const businessPhone = settingsRow?.phone_number  ?? profile.phone          ?? "";

    // Check monthly SMS limit
    const planLimit = PLAN_LIMITS[profile.plan ?? "trial"] ?? PLAN_LIMITS["trial"];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: sentThisMonth } = await supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "sent")
      .gte("sent_at", monthStart);

    let remaining = planLimit - (sentThisMonth ?? 0);

    // Send warning email at 80% and 100% usage (once per threshold per month)
    const usedPct = ((sentThisMonth ?? 0) / planLimit) * 100;
    const userEmail = profile.email ?? null;
    const planLabel = profile.plan ?? "trial";
    const renewsDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    if (userEmail && usedPct >= 100 && !profile.limit_email_sent_full) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TextReminder <hello@textreminder.co.uk>",
          to: userEmail,
          subject: "You've reached your SMS limit for this month",
          html: `<p>Hi,</p><p>You've used all <strong>${planLimit} SMS reminders</strong> on your ${planLabel} plan this month.</p><p>No further reminders will be sent until your allowance resets on <strong>${renewsDate}</strong>.</p><p>To keep reminders going, <a href="https://textreminder.co.uk/settings">upgrade your plan</a>.</p><p>— TextReminder</p>`,
        }),
      }).catch(() => {/* don't block on email failure */});
      await supabase.from("profiles").update({ limit_email_sent_full: true }).eq("id", profile.id);
    } else if (userEmail && usedPct >= 80 && !profile.limit_email_sent_80) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TextReminder <hello@textreminder.co.uk>",
          to: userEmail,
          subject: "You're nearly at your SMS limit",
          html: `<p>Hi,</p><p>You've used <strong>${sentThisMonth} of your ${planLimit} SMS reminders</strong> this month on your ${planLabel} plan — that's ${Math.round(usedPct)}%.</p><p>Your allowance resets on <strong>${renewsDate}</strong>. If you're running low, <a href="https://textreminder.co.uk/settings">upgrade your plan</a> to avoid reminders stopping.</p><p>— TextReminder</p>`,
        }),
      }).catch(() => {/* don't block on email failure */});
      await supabase.from("profiles").update({ limit_email_sent_80: true }).eq("id", profile.id);
    }

    if (remaining <= 0) {
      errors.push(`User ${profile.id} has reached their monthly limit of ${planLimit} SMS.`);
      continue;
    }

    // Loop every schedule slot
    for (let schedIdx = 0; schedIdx < schedule.length; schedIdx++) {
      const sched    = schedule[schedIdx];
      const offsetMs = offsetToMs(sched.value, sched.unit);

      // ±30-min window around the exact offset to catch cron drift without double-firing
      const windowStart = new Date(now.getTime() + offsetMs - 30 * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + offsetMs + 30 * 60 * 1000);

      // Fetch events in this time window (no reminder_sent filter — we track per-slot below)
      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", profile.id)
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString());

      for (const event of events ?? []) {
        // Has this specific schedule slot already fired for this event?
        const sentIndices: number[] = event.reminder_sent_indices ?? [];
        if (sentIndices.includes(schedIdx)) continue;

        // If the event has specific template_ids selected, only fire slots whose template is in that list
        const eventTemplateIds: number[] | null = Array.isArray(event.template_ids) && event.template_ids.length
          ? event.template_ids.map(Number)
          : null;
        if (eventTemplateIds && !eventTemplateIds.includes(sched.template_id || 1)) continue;

        // Resolve phone list — prefer the phones array, fall back to phone field, then title extraction
        const phoneFromTitle = event.title?.match(/(\+44\d{10}|07\d{9})/)?.[0];
        const attendees: { name?: string; phone?: string }[] = event.attendees ?? [];
        const phonesArray: string[] = Array.isArray(event.phones) && event.phones.length
          ? event.phones
          : null
          ?? (event.phone
              ? event.phone.split(",").map((p: string) => p.trim()).filter(Boolean)
              : null)
          ?? (attendees.length > 0 && attendees[0].phone ? [attendees[0].phone] : null)
          ?? (phoneFromTitle ? [phoneFromTitle] : []);

        if (!phonesArray.length) continue;

        // Mark this slot as sent before we attempt the SMS (prevents dupes on retry)
        const newSentIndices = [...sentIndices, schedIdx];
        const allSlotsDone   = newSentIndices.length >= schedule.length;
        await supabase
          .from("calendar_events")
          .update({
            reminder_sent_indices: newSentIndices,
            reminder_sent: allSlotsDone,
          })
          .eq("id", event.id);

        // Resolve template for this slot
        const templateId   = sched.template_id || 1;
        const templateDef  = templates.find((t) => t.id === templateId) ?? templates[0];
        const templateBody = templateDef?.body ?? DEFAULT_TEMPLATE_BODY;

        // Build message
        const attendee = attendees[0] ?? {};
        const appointmentTime = new Date(event.start_time);
        const timeStr = appointmentTime.toLocaleTimeString("en-GB", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
        });
        const dateStr = appointmentTime.toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London",
        });

        const message = templateBody
          .replace("{name}",           attendee.name ?? "there")
          .replace("{time}",           timeStr)
          .replace("{date}",           dateStr)
          .replace("{business_phone}", businessPhone)
          .replace("{business_name}",  businessName)
          .replace("{business}",       businessName)
          .replace("{phone}",          businessPhone);

        // Send to every phone number on the event (respect remaining quota)
        const phoneList = phonesArray;

        for (const phone of phoneList) {
          if (remaining <= 0) {
            errors.push(`User ${profile.id} hit monthly limit mid-batch — stopping.`);
            break;
          }
          const toNumber = phone.startsWith("+") ? phone : phone.replace(/^0/, "+44");

          let status        = "sent";
          let messageSid: string | null    = null;
          let errorMessage: string | null  = null;

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
              status       = "failed";
              errorMessage = smsData.message ?? smsData.error ?? "SMS Works error";
              errors.push(`Event ${event.id} slot ${schedIdx}: ${errorMessage}`);
            } else {
              messageSid = smsData.messageid ?? smsData.messageId ?? null;
              results.push({ event: event.id, slot: schedIdx, phone: toNumber, messageid: messageSid });
              remaining--;
            }
          } catch (e) {
            status       = "failed";
            errorMessage = String(e);
            errors.push(`Event ${event.id} slot ${schedIdx}: ${errorMessage}`);
          }

          // Log to reminders table
          const { error: insertError } = await supabase.from("reminders").insert({
            user_id:           profile.id,
            contact_name:      attendee.name ?? event.title ?? "Unknown",
            contact_phone:     toNumber,
            appointment_time:  event.start_time,
            channel:           "sms",
            message,
            status,
            sent_at:           status === "sent" ? now.toISOString() : null,
            calendar_event_id: event.external_id,
            twilio_sid:        messageSid,
            error_message:     errorMessage,
          });
          if (insertError) {
            errors.push(`reminders insert failed for event ${event.id}: ${insertError.message}`);
            console.error("reminders insert error:", insertError.message);
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
