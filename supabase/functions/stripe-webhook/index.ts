import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PLAN_BY_PRICE: Record<string, string> = {
  "price_1TcihWR9jC1DqPOTo9YR6ezb": "starter",
  "price_1Tcij2R9jC1DqPOT3DG5Yglg": "starter",
  "price_1TcijkR9jC1DqPOThyO4N4cM": "professional",
  "price_1TcikLR9jC1DqPOTNBo6pCLs": "professional",
  "price_1TcikpR9jC1DqPOT0hEhrIH2": "business",
  "price_1TcilDR9jC1DqPOTplkB8qO5": "business",
  "price_1TciljR9jC1DqPOTQ7TABbpF": "enterprise",
  "price_1TcimUR9jC1DqPOTgV2Pogmz": "enterprise",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.text();
  let event: any;

  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { type, data } = event;

  if (type === "checkout.session.completed") {
    const session = data.object;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    const billing = session.metadata?.billing;

    if (userId && plan) {
      await supabase.from("profiles").update({
        plan,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
    }
  }

  if (type === "customer.subscription.updated") {
    const sub = data.object;
    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = PLAN_BY_PRICE[priceId];
    const customerId = sub.customer;

    if (plan && customerId) {
      await supabase.from("profiles").update({
        plan,
        updated_at: new Date().toISOString(),
      }).eq("stripe_customer_id", customerId);
    }
  }

  if (type === "customer.subscription.deleted") {
    const sub = data.object;
    const customerId = sub.customer;

    if (customerId) {
      await supabase.from("profiles").update({
        plan: "free",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq("stripe_customer_id", customerId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
