import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Maillon — Le réseau B2B à double consentement";
const description = "Maillon met en relation les entreprises uniquement lorsque les deux parties sont d'accord : annuaire, score d'affinité, messagerie, visio et campagnes d'emailing, en toute confidentialité.";

export const metadata = {
  metadataBase: new URL("https://getmaillon.fr"),
  title: { default: title, template: "%s — Maillon" },
  description,
  keywords: ["réseau B2B", "mise en relation entreprises", "double consentement", "prospection B2B", "annuaire entreprises France"],
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "https://getmaillon.fr",
    siteName: "Maillon",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/logo-maillon-ink.png", width: 1178, height: 308, alt: "Maillon" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/logo-maillon-ink.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
