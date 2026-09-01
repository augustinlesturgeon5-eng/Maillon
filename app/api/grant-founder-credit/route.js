import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Pour chaque offre payante : ses price ids Stripe, la valeur d'un mois (centimes) à créditer, et son nom
const PLAN_CREDITS = [
  {
    priceIds: [process.env.STRIPE_PRICE_FORT_MONTHLY, process.env.STRIPE_PRICE_FORT_ANNUAL, process.env.STRIPE_PRICE_FORT_NOCOMMIT].filter(Boolean),
    cents: 3999, // 39,99 €
    name: "Maillon Fort",
  },
  {
    priceIds: [process.env.STRIPE_PRICE_CENTRAL_MONTHLY, process.env.STRIPE_PRICE_CENTRAL_ANNUAL, process.env.STRIPE_PRICE_CENTRAL_NOCOMMIT].filter(Boolean),
    cents: 1999, // 19,99 €
    name: "Maillon Central",
  },
];

export async function POST(req) {
  try {
    const { inviterCompanyId, accessToken } = await req.json();
    if (!inviterCompanyId || !accessToken) {
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

    const { data: inviter, error: inviterErr } = await supabase
      .from("companies")
      .select("id,stripe_customer_id")
      .eq("id", inviterCompanyId)
      .single();
    if (inviterErr || !inviter || !inviter.stripe_customer_id) {
      return NextResponse.json({ applied: false });
    }

    const subs = await stripe.subscriptions.list({
      customer: inviter.stripe_customer_id,
      status: "all",
      limit: 5,
    });
    const active = subs.data.find((s) => s.status === "active" || s.status === "trialing");
    const priceId = active?.items?.data?.[0]?.price?.id;
    const matched = active && PLAN_CREDITS.find((p) => p.priceIds.includes(priceId));
    if (!matched) {
      return NextResponse.json({ applied: false });
    }

    await stripe.customers.createBalanceTransaction(inviter.stripe_customer_id, {
      amount: -matched.cents,
      currency: "eur",
      description: `Offre Fondateur Maillon — 1 mois offert sur ${matched.name} (entreprise parrainée inscrite)`,
    });

    return NextResponse.json({ applied: true, plan: matched.name });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Erreur inattendue" }, { status: 500 });
  }
}
