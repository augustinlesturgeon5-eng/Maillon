import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé Daily manquante côté serveur" }, { status: 500 });
  }
  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.error || data.info || "Erreur Daily" }, { status: 500 });
  }
  return NextResponse.json({ url: data.url });
}
