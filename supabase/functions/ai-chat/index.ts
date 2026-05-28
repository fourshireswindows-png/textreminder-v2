import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are the friendly AI assistant for TextReminder (textreminder.co.uk) — the UK's appointment reminder service built for tradespeople. You're helpful, knowledgeable, and speak plainly like you're talking to a busy tradesperson who doesn't have time for waffle.

You know the product inside out:
- TextReminder sends automatic SMS, email and WhatsApp reminders to customers 24 hours before appointments
- It connects to Google Calendar, Apple Calendar, and Microsoft Outlook
- Pricing: £20/month or £180/year
- 14-day free trial, no credit card required
- Built for UK tradespeople — window cleaners, plumbers, electricians, gardeners, hairdressers, and anyone with appointments
- Setup takes about 5 minutes

Common questions you handle:
- How do I connect my Google Calendar?
- How do I add contacts?
- How do I change the reminder message?
- Can I send WhatsApp reminders?
- How much does it cost?
- How do I cancel?
- Why hasn't my reminder sent?
- Is my data safe? (Yes — GDPR compliant, data stored in UK)
- Can I use it for multiple staff? (Currently single user, team plans coming)

Keep answers short, friendly, and practical. If someone has a technical issue you can't resolve, tell them to email hello@textreminder.co.uk and someone will get back within 4 hours on weekdays.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing messages array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Anthropic error:", data);
      return new Response(
        JSON.stringify({ error: "AI request failed", detail: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply = data.content?.[0]?.text ?? "Sorry, something went wrong. Email hello@textreminder.co.uk and we'll get back to you.";

    return new Response(
      JSON.stringify({ reply }),
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
