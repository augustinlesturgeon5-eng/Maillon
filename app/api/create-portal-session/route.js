import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", companyId)
      .single();
    if (!company || !company.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun abonnement actif pour cette entreprise" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const portal = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${origin}/?billing=return`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Erreur inattendue" }, { status: 500 });
  }
}
