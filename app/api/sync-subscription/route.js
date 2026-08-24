import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_CENTRAL_MONTHLY]: { planId: "essentiel", billing: "Mensuelle" },
  [process.env.STRIPE_PRICE_CENTRAL_ANNUAL]: { planId: "essentiel", billing: "Annuelle" },
  [process.env.STRIPE_PRICE_CENTRAL_NOCOMMIT]: { planId: "essentiel", billing: "SansEngagement" },
  [process.env.STRIPE_PRICE_FORT_MONTHLY]: { planId: "pro", billing: "Mensuelle" },
  [process.env.STRIPE_PRICE_FORT_ANNUAL]: { planId: "pro", billing: "Annuelle" },
  [process.env.STRIPE_PRICE_FORT_NOCOMMIT]: { planId: "pro", billing: "SansEngagement" },
};

export async function POST(req) {
  try {
    const { companyId, accessToken } = await req.json();
    if (!companyId || !accessToken) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Clé Stripe manquante côté serveur" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select("id,stripe_customer_id")
      .eq("id", companyId)
      .single();
    if (companyErr || !company) {
      return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
    }
    if (!company.stripe_customer_id) {
      return NextResponse.json({ planId: "gratuit", billing: null });
    }

    const subs = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: "all",
      limit: 5,
    });
    const active = subs.data.find((s) => s.status === "active" || s.status === "trialing");

    if (!active) {
      await supabase
        .from("companies")
        .update({ plan_id: "gratuit", billing: null, stripe_subscription_id: null, subscription_status: subs.data[0]?.status || null })
        .eq("id", companyId);
      return NextResponse.json({ planId: "gratuit", billing: null });
    }

    const priceId = active.items.data[0]?.price?.id;
    const mapping = PRICE_TO_PLAN[priceId] || { planId: "gratuit", billing: null };
    await supabase
      .from("companies")
      .update({
        plan_id: mapping.planId,
        billing: mapping.billing,
        stripe_subscription_id: active.id,
        subscription_status: active.status,
      })
      .eq("id", companyId);

    return NextResponse.json({ planId: mapping.planId, billing: mapping.billing });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Erreur inattendue" }, { status: 500 });
  }
}
