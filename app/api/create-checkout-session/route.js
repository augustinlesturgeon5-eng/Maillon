import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_MAP = {
  essentiel: {
    Mensuelle: process.env.STRIPE_PRICE_CENTRAL_MONTHLY,
    Annuelle: process.env.STRIPE_PRICE_CENTRAL_ANNUAL,
    SansEngagement: process.env.STRIPE_PRICE_CENTRAL_NOCOMMIT,
  },
  pro: {
    Mensuelle: process.env.STRIPE_PRICE_FORT_MONTHLY,
    Annuelle: process.env.STRIPE_PRICE_FORT_ANNUAL,
    SansEngagement: process.env.STRIPE_PRICE_FORT_NOCOMMIT,
  },
};

export async function POST(req) {
  try {
    const { companyId, planId, billing, email, accessToken } = await req.json();
    if (!companyId || !planId || !billing || !accessToken) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    const priceId = PRICE_MAP[planId] && PRICE_MAP[planId][billing];
    if (!priceId) {
      return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
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
      return NextResponse.json({ error: "Entreprise introuvable : " + (companyErr ? companyErr.message : "") }, { status: 404 });
    }

    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { company_id: companyId } });
      customerId = customer.id;
      await supabase.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId);
    }

    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: { company_id: companyId, plan_id: planId, billing },
      subscription_data: { metadata: { company_id: companyId, plan_id: planId, billing } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Erreur inattendue" }, { status: 500 });
  }
}
