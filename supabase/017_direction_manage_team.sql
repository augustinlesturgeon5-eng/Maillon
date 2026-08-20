-- Permet à la Direction de modifier les profils de ses collègues (rôle, statut actif/désactivé)
-- sans provoquer de boucle infinie dans la règle de sécurité (même technique que auth_company_id()).
create or replace function auth_is_direction()
returns boolean
language sql
security definer
stable
as $$
  select role = 'Direction' from public.profiles where id = auth.uid()
$$;

create policy "Direction can manage teammates in their company"
  on profiles for update
  to authenticated
  using (company_id = auth_company_id() and auth_is_direction());
