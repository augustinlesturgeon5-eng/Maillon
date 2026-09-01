import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const FORT_PRICE_IDS = [
  process.env.STRIPE_PRICE_FORT_MONTHLY,
  process.env.STRIPE_PRICE_FORT_ANNUAL,
  process.env.STRIPE_PRICE_FORT_NOCOMMIT,
].filter(Boolean);

const FORT_MONTHLY_CENTS = 3999; // 39,99 € — valeur d'un mois d'abonnement Maillon Fort

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
    if (!active || !FORT_PRICE_IDS.includes(priceId)) {
      return NextResponse.json({ applied: false });
    }

    await stripe.customers.createBalanceTransaction(inviter.stripe_customer_id, {
      amount: -FORT_MONTHLY_CENTS,
      currency: "eur",
      description: "Offre Fondateur Maillon — 1 mois offert (entreprise parrainée inscrite)",
    });

    return NextResponse.json({ applied: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Erreur inattendue" }, { status: 500 });
  }
}
