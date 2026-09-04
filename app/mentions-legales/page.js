import LegalLayout from "../_components/LegalLayout";

export const metadata = { title: "Mentions légales — Maillon" };

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" updated="4 septembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site getmaillon.fr (« Maillon ») est édité par :<br />
        <strong>Augustin Lesturgeon</strong>, entreprise individuelle (micro-entreprise)<br />
        SIRET : 102 531 068 00017<br />
        Siège social : 35 rue de la Mairie, 22150 Plouguenast-Langast, France<br />
        TVA non applicable, article 293 B du Code général des impôts<br />
        Contact : <a href="mailto:contact@getmaillon.fr">contact@getmaillon.fr</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Augustin Lesturgeon.</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par :<br />
        Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br />
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>
      <p>
        La base de données et l'authentification sont gérées par Supabase, les paiements par Stripe,
        l'envoi d'emails par Resend et la visioconférence par Daily.co. Le détail de ces prestataires
        est précisé dans notre <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments du site Maillon (textes, structure, identité visuelle, logo) est la
        propriété d'Augustin Lesturgeon, sauf mention contraire. Toute reproduction ou représentation,
        totale ou partielle, sans autorisation préalable, est interdite.
      </p>
      <p>
        Les entreprises inscrites restent seules propriétaires des contenus qu'elles publient sur leur
        page (description, offres, logo) et en garantissent la licéité.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données personnelles collectées via Maillon est détaillé dans notre{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative au site ou à son contenu :{" "}
        <a href="mailto:contact@getmaillon.fr">contact@getmaillon.fr</a>.
      </p>
    </LegalLayout>
  );
}
