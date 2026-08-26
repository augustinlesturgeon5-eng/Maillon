-- Autorise les deux entreprises d'une connexion à la modifier (pas seulement celle qui a accepté)
-- Nécessaire pour : se déconnecter d'une entreprise, et gérer le consentement emailing après coup.
drop policy if exists "Recipient company can respond" on connections;

create policy "Either company can update their connection"
  on connections for update to authenticated
  using (from_company_id = auth_company_id() or to_company_id = auth_company_id());
