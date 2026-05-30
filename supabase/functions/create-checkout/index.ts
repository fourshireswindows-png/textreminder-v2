import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICE_IDS: Record<string, string> = {
  "starter-monthly":      "price_1TcihWR9jC1DqPOTo9YR6ezb",
  "starter-annual":       "price_1Tcij2R9jC1DqPOT3DG5Yglg",
  "professional-monthly": "price_1TcijkR9jC1DqPOThyO4N4cM",
  "professional-annual":  "price_1TcikLR9jC1DqPOTNBo6pCLs",
  "business-monthly":     "price_1TcikpR9jC1DqPOT0hEhrIH2",
  "business-annual":      "price_1TcilDR9jC1DqPOTplkB8qO5",
  "enterprise-monthly":   "price_1TciljR9jC1DqPOTQ7TABbpF",
  "enterprise-annual":    "price_1TcimUR9jC1DqPOTgV2Pogmz",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan, billing, userId, email } = await req.json();
    const priceKey = `${plan}-${billing}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown plan: ${priceKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = new URLSearchParams({
      "mode": "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "success_url": "https://textreminder.co.uk?payment=success",
      "cancel_url": "https://textreminder.co.uk?payment=cancelled",
      "customer_email": email,
      "metadata[user_id]": userId,
      "metadata[plan]": plan,
      "metadata[billing]": billing,
      "allow_promotion_codes": "true",
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: session.error?.message ?? "Stripe error" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
