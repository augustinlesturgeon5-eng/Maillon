import { NextResponse } from "next/server";

export async function POST(req) {
  const { subject, html, text, recipients, fromName, replyTo } = await req.json();
  if (!subject || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé Resend manquante côté serveur" }, { status: 500 });
  }
  const from = `${fromName || "Maillon"} <campagnes@getmaillon.fr>`;

  const results = await Promise.all(
    recipients.map(async (r) => {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [r.email],
            subject,
            html: html && html.trim() ? html : `<p>${(text || "").replace(/\n/g, "<br/>")}</p>`,
            ...(replyTo ? { reply_to: replyTo } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) return { email: r.email, ok: false, error: data.message || "Erreur d'envoi" };
        return { email: r.email, ok: true, id: data.id };
      } catch (e) {
        return { email: r.email, ok: false, error: String(e) };
      }
    })
  );

  return NextResponse.json({ results });
}
