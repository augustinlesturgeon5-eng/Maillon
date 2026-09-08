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
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Maillon — Le réseau des entreprises qui se choisissent" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  verification: {
    other: { "msvalidate.01": "4A9F5621A6539E0F0859F2AD66D3D0B7" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://getmaillon.fr/#organization",
      name: "Maillon",
      url: "https://getmaillon.fr",
      logo: "https://getmaillon.fr/logo-maillon-ink.png",
      description,
    },
    {
      "@type": "WebSite",
      "@id": "https://getmaillon.fr/#website",
      name: "Maillon",
      url: "https://getmaillon.fr",
      publisher: { "@id": "https://getmaillon.fr/#organization" },
      inLanguage: "fr-FR",
    },
    {
      "@type": "Service",
      name: "Maillon",
      url: "https://getmaillon.fr",
      description,
      provider: { "@id": "https://getmaillon.fr/#organization" },
      areaServed: "FR",
      serviceType: "Réseau B2B à double consentement",
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
