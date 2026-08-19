-- Corrige une boucle infinie dans la règle de sécurité de "profiles" :
-- elle se référençait elle-même pour vérifier l'entreprise de l'utilisateur.
-- On passe par une petite fonction technique qui contourne ce problème.

create or replace function auth_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

drop policy "Users can view their own profile and teammates" on profiles;

create policy "Users can view their own profile and teammates"
  on profiles for select
  to authenticated
  using (
    id = auth.uid()
    or company_id = auth_company_id()
  );
