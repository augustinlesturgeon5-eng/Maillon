const PAGES = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu-cgv", label: "CGU / CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export default function LegalLayout({ title, updated, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF9", color: "#26282B" }}>
      <style>{`
        .legaldoc a { color: #0F846B; text-decoration: none; }
        .legaldoc a:hover { text-decoration: underline; }
        .legaldoc h2 { font-size: 18px; font-weight: 700; margin: 34px 0 10px; letter-spacing: -0.01em; }
        .legaldoc h2:first-of-type { margin-top: 0; }
        .legaldoc p, .legaldoc li { font-size: 14.5px; line-height: 1.65; color: #40423F; }
        .legaldoc ul { margin: 10px 0; padding-left: 20px; }
        .legaldoc li { margin: 4px 0; }
        .legaldoc strong { color: #26282B; }
        .legalnav a { font-size: 13px; color: #63665F; text-decoration: none; padding: 6px 0; border-bottom: 2px solid transparent; }
        .legalnav a:hover { color: #26282B; }
        .legalnav a.on { color: #0F846B; border-bottom-color: #0F846B; }
      `}</style>

      <header style={{ borderBottom: "1px solid #E5E5E2", padding: "18px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontWeight: 700, fontSize: 17, color: "#26282B", textDecoration: "none" }}>
            Maillon
          </a>
          <nav className="legalnav" style={{ display: "flex", gap: 18 }}>
            {PAGES.map((p) => (
              <a key={p.href} href={p.href} className={p.label === title ? "on" : ""}>{p.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "44px 24px 80px" }}>
        <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8C88", marginBottom: 8 }}>
          Dernière mise à jour : {updated}
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 30 }}>{title}</h1>
        <div className="legaldoc">{children}</div>
      </main>

      <footer style={{ borderTop: "1px solid #E5E5E2", padding: "20px 24px", textAlign: "center" }}>
        <a href="/" style={{ fontSize: 13, color: "#63665F" }}>&larr; Retour à Maillon</a>
      </footer>
    </div>
  );
}
