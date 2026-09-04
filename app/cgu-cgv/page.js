import LegalLayout from "../_components/LegalLayout";

export const metadata = { title: "CGU / CGV — Maillon" };

export default function CguCgv() {
  return (
    <LegalLayout title="CGU / CGV" updated="4 septembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales régissent l'accès et l'utilisation du service Maillon,
        édité par Augustin Lesturgeon (voir nos <a href="/mentions-legales">mentions légales</a>) :
        les conditions générales d'utilisation (CGU) pour l'usage du service, et les conditions
        générales de vente (CGV) pour les offres payantes (Maillon Central, Maillon Fort).
        L'inscription sur Maillon vaut acceptation pleine et entière des présentes conditions.
      </p>

      <h2>2. Description du service</h2>
      <p>
        Maillon est un réseau B2B qui permet à des entreprises de se découvrir, d'estimer leur
        affinité, et de se mettre en relation uniquement lorsque les deux parties donnent leur accord
        (double consentement). Le service inclut notamment un annuaire d'entreprises, une messagerie
        cloisonnée par service, de la visioconférence, des campagnes d'emailing soumises au
        consentement du destinataire, et un programme de parrainage (« Offre Fondateur »).
      </p>

      <h2>3. Inscription</h2>
      <p>
        Maillon est réservé aux professionnels agissant dans le cadre de leur activité professionnelle.
        L'entreprise inscrite s'engage à fournir des informations exactes et à jour (nom, secteur,
        SIRET le cas échéant) et est responsable de la confidentialité de ses identifiants de connexion.
      </p>

      <h2>4. Offres et tarifs</h2>
      <ul>
        <li><strong>Premier Maillon</strong> (gratuit) — 5 démarchages non renouvelables, sans carte bancaire.</li>
        <li><strong>Maillon Central</strong> — 19,99&nbsp;€/mois, 199,90&nbsp;€/an, ou 29,99&nbsp;€/mois sans engagement.</li>
        <li><strong>Maillon Fort</strong> — 39,99&nbsp;€/mois, 399,90&nbsp;€/an, ou 49,99&nbsp;€/mois sans engagement.</li>
      </ul>
      <p>
        Tarifs exprimés en euros, TVA non applicable (article 293 B du Code général des impôts). Le
        détail des fonctionnalités incluses dans chaque offre est présenté sur la page tarifs de Maillon.
      </p>

      <h2>5. Paiement, durée et résiliation</h2>
      <p>
        Le paiement s'effectue par carte bancaire via notre prestataire Stripe, qui seul détient les
        coordonnées bancaires. Les offres payantes sont reconduites tacitement à chaque échéance
        (mensuelle ou annuelle) sauf résiliation. Chaque entreprise peut résilier à tout moment depuis
        « Mon compte » ; la résiliation prend effet à la fin de la période en cours déjà payée, sans
        remboursement au prorata.
      </p>

      <h2>6. Droit de rétractation</h2>
      <p>
        Conformément au Code de la consommation, le droit de rétractation de 14 jours ne s'applique
        qu'aux contrats conclus avec des consommateurs. Les services Maillon étant fournis à des
        professionnels agissant dans le cadre de leur activité, ce droit ne s'applique pas aux
        présentes conditions.
      </p>

      <h2>7. Offre Fondateur</h2>
      <p>
        Toute entreprise peut inviter une autre entreprise à rejoindre Maillon via son lien personnel.
        Lorsque l'entreprise invitée finalise son inscription via ce lien, l'entreprise à l'origine de
        l'invitation reçoit un mois offert sur Maillon Fort (déduit de sa facture si elle est déjà
        abonnée, ou activé directement sinon) ainsi que le badge « Entreprise Fondatrice », acquis à
        vie. L'entreprise invitée ne reçoit aucun avantage particulier au titre de l'invitation.
        Maillon se réserve le droit de suspendre un compte en cas d'usage abusif du programme
        (auto-invitation, création de comptes fictifs).
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Maillon met en relation des entreprises mais n'est partie à aucun contrat, devis ou
        engagement commercial conclu directement entre elles. Chaque entreprise reste seule
        responsable des échanges, accords et transactions qu'elle conclut avec une autre entreprise
        via la plateforme. Maillon met en œuvre des moyens raisonnables pour assurer la disponibilité
        du service, sans garantie de continuité absolue (maintenance, cas de force majeure,
        dysfonctionnement d'un prestataire technique).
      </p>

      <h2>9. Données personnelles</h2>
      <p>
        Le traitement des données est détaillé dans notre{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>10. Modification des conditions</h2>
      <p>
        Maillon peut faire évoluer les présentes conditions ; les entreprises inscrites seront
        informées de tout changement substantiel par email ou notification dans l'application.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Tout litige relève, à défaut de
        résolution amiable, des juridictions compétentes du ressort du domicile de l'éditeur.
      </p>
    </LegalLayout>
  );
}
