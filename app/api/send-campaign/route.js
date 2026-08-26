import { NextResponse } from "next/server";

const buildBrandedEmail = ({ heading, bodyHtml, ctaText, ctaHref }) => `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:36px 16px;background:#F5F4F0;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
      <tr><td style="text-align:center;padding:0 0 26px;">
        <img src="https://getmaillon.fr/logo-maillon-ink.png" alt="Maillon" height="26" style="display:inline-block;border:0;"/>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:40px 36px;">
        <h1 style="margin:0 0 16px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:#0F1826;">${heading}</h1>
        <div style="font-size:15px;line-height:1.65;color:#3d4552;">${bodyHtml}</div>
        ${ctaHref ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 6px;"><tr><td style="border-radius:10px;background:#0F846B;"><a href="${ctaHref}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">${ctaText}</a></td></tr></table>` : ""}
      </td></tr>
      <tr><td style="text-align:center;padding:26px 12px 0;font-size:12px;line-height:1.6;color:#8A929C;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">
        Maillon — le réseau B2B à double consentement<br/>getmaillon.fr
      </td></tr>
    </table>
  </body>
</html>`;

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
            html: html && html.trim() ? html : buildBrandedEmail({
              heading: subject,
              bodyHtml: `<p>${(text || "").replace(/\n/g, "<br/>")}</p>`,
              ctaText: "Voir sur Maillon",
              ctaHref: "https://getmaillon.fr",
            }),
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
