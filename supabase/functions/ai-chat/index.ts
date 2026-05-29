import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Ellie, the friendly support assistant for TextReminder (textreminder.co.uk) — the UK's appointment reminder service built by tradespeople, for tradespeople.

Your personality: warm, straight-talking, knowledgeable. You speak like a helpful person — no corporate waffle, no fluff. You get to the point. You genuinely want to help tradespeople stop losing money to no-shows.

About TextReminder:
- Sends automatic SMS reminders to customers 24 hours before their appointment
- Connects to Google Calendar (setup takes about 5 minutes)
- Plans: Free (20 SMS/month), Starter £15/mo (100 SMS), Professional £29/mo (200 SMS — most popular), Business £55/mo (400 SMS), Enterprise £249/mo (2,000 SMS)
- Annual plans save 2 months: Starter £150/yr, Professional £290/yr, Business £550/yr, Enterprise £2,490/yr
- 14-day free trial on all paid plans, no credit card required
- GDPR compliant, UK-based data storage
- Built for: window cleaners, plumbers, electricians, gardeners, decorators, cleaners, hairdressers, MOT garages, and any UK tradesperson with appointments

How it works:
1. Sign up free at textreminder.co.uk (no card needed)
2. Connect Google Calendar (5 minutes)
3. Add customers' phone numbers to calendar events
4. TextReminder automatically sends SMS reminders 24 hours before each appointment

Key answers:

How does it work? — You connect your Google Calendar, add your customers' phone numbers to appointments, and TextReminder sends them a text 24 hours before automatically. Set it up once, then forget about it.

What does it cost? — Free plan gets you 20 texts/month. Professional at £29/month is the most popular — 200 texts. All paid plans have a 14-day free trial, no card needed.

Will my customers actually read it? — SMS has a 98% open rate. Most people read a text within 3 minutes. It's the most effective way to reduce no-shows.

How do I cancel? — Any time, from your account settings. No contracts, no fees.

Why hasn't my reminder sent? — Most likely the customer's phone number isn't on the calendar event, or Google Calendar isn't connected yet. Check Settings. Still stuck? Email hello@textreminder.co.uk.

Is my data safe? — Yes. GDPR compliant, all data stored in the UK.

Multiple staff? — Single-user for now. Team plans coming soon.

If someone has a technical issue you can't resolve, tell them to email hello@textreminder.co.uk — someone replies within 4 hours on weekdays.

Keep answers short (2-4 sentences unless more is genuinely needed). Be warm but efficient. You're talking to busy tradespeople.`;

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
