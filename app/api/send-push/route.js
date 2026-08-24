import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const { profileId, title, body, url, accessToken } = await req.json();
  if (!profileId || !title || !accessToken) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Clés VAPID manquantes côté serveur" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:contact@maillon.app", publicKey, privateKey);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("profile_id", profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) return NextResponse.json({ results: [] });

  const payload = JSON.stringify({ title, body: body || "", url: url || "/" });
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        return { ok: true };
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
        return { ok: false, error: String(e) };
      }
    })
  );
  return NextResponse.json({ results });
}
