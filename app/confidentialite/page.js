import LegalLayout from "../_components/LegalLayout";

export const metadata = { title: "Politique de confidentialité — Maillon" };

export default function Confidentialite() {
  return (
    <LegalLayout title="Confidentialité" updated="4 septembre 2026">
      <h2>Responsable de traitement</h2>
      <p>
        Augustin Lesturgeon, entreprise individuelle (SIRET 102 531 068 00017), est responsable du
        traitement des données décrites ci-dessous. Contact :{" "}
        <a href="mailto:contact@getmaillon.fr">contact@getmaillon.fr</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li><strong>Compte</strong> — adresse email et mot de passe (géré par Supabase Auth, jamais stocké en clair).</li>
        <li><strong>Entreprise</strong> — nom, secteur, localisation, effectif, chiffre d'affaires, SIRET, description, offres et recherches, logo.</li>
        <li><strong>Équipe</strong> — nom complet et rôle des collaborateurs rattachés au compte.</li>
        <li><strong>Mises en relation</strong> — demandes de connexion, messages échangés entre entreprises connectées.</li>
        <li><strong>Emailing</strong> — campagnes envoyées aux entreprises ayant explicitement consenti à les recevoir, et adresses associées.</li>
        <li><strong>Visioconférence</strong> — création de salons temporaires via notre prestataire Daily.co ; les appels ne sont pas enregistrés.</li>
        <li><strong>Notifications</strong> — jeton de notification push de votre navigateur, si vous les activez.</li>
        <li><strong>Facturation</strong> — gérée entièrement par Stripe ; Maillon ne stocke aucune coordonnée bancaire.</li>
        <li><strong>Journal d'activité</strong> — historique des actions effectuées sur le compte, à des fins de sécurité et de support.</li>
      </ul>

      <h2>Finalités</h2>
      <p>
        Ces données sont utilisées pour fournir le service (annuaire, mise en relation, messagerie,
        facturation), sécuriser les comptes, répondre aux demandes de support, et, avec votre
        consentement, envoyer des communications par email.
      </p>

      <h2>Base légale</h2>
      <p>
        Exécution du contrat (CGU/CGV) pour le fonctionnement du service et la facturation,
        consentement pour l'emailing et les notifications push, intérêt légitime pour la sécurité et
        la prévention des abus.
      </p>

      <h2>Destinataires et sous-traitants</h2>
      <p>Vos données peuvent être traitées par les prestataires techniques suivants, dans la stricte mesure nécessaire au fonctionnement de Maillon :</p>
      <ul>
        <li><strong>Supabase</strong> — base de données et authentification.</li>
        <li><strong>Vercel</strong> — hébergement du site.</li>
        <li><strong>Stripe</strong> — traitement des paiements.</li>
        <li><strong>Resend</strong> — envoi des emails transactionnels et de campagne.</li>
        <li><strong>Daily.co</strong> — infrastructure de visioconférence.</li>
      </ul>
      <p>
        Certains de ces prestataires peuvent traiter des données en dehors de l'Union européenne
        (notamment aux États-Unis), dans le cadre de garanties appropriées telles que les clauses
        contractuelles types de la Commission européenne.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte
        ou de demande d'effacement, vos données sont supprimées dans un délai raisonnable, sauf
        obligation légale de conservation plus longue (notamment comptable).
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Maillon utilise des cookies techniques indispensables au fonctionnement du service
        (authentification) ainsi qu'un stockage local dans votre navigateur pour mémoriser vos
        préférences (langue, thème). Aucun cookie publicitaire ni outil de mesure d'audience tiers
        n'est utilisé à ce jour.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément au Règlement général sur la protection des données (RGPD), vous disposez d'un
        droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité
        sur vos données. Vous pouvez exercer ces droits à tout moment en écrivant à{" "}
        <a href="mailto:contact@getmaillon.fr">contact@getmaillon.fr</a>. Vous disposez également du
        droit d'introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
      </p>
    </LegalLayout>
  );
}
