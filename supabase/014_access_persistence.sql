-- Persiste les droits d'accès & cloisonnement de chaque entreprise
alter table companies add column admin_services text[];
alter table companies add column access_grants jsonb not null default '{}'::jsonb;
