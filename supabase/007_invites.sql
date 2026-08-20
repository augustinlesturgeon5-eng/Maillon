-- Invitations d'équipe : permet à un collègue de rejoindre une entreprise existante
create table invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text,
  role text default 'Direction',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending',
  created_at timestamptz default now()
);

alter table invites enable row level security;

-- L'entreprise voit et gère ses propres invitations envoyées
create policy "Company can view its own invites"
  on invites for select
  to authenticated
  using (company_id = auth_company_id());

create policy "Company can create invites"
  on invites for insert
  to authenticated
  with check (company_id = auth_company_id());

create policy "Company can update its own invites"
  on invites for update
  to authenticated
  using (company_id = auth_company_id());

-- Consulter une invitation via son jeton (lien reçu), sans exposer toute la table
create or replace function get_invite(invite_token uuid)
returns table(company_id uuid, role text, company_name text, status text)
language sql
security definer
stable
as $$
  select i.company_id, i.role, c.name, i.status
  from invites i
  join companies c on c.id = i.company_id
  where i.token = invite_token
$$;

grant execute on function get_invite(uuid) to authenticated, anon;

-- Rejoindre l'entreprise via le jeton : rattache le profil et clôt l'invitation
create or replace function accept_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  inv record;
begin
  select * into inv from invites where token = invite_token and status = 'pending';
  if inv is null then
    raise exception 'Invitation invalide ou déjà utilisée';
  end if;
  update profiles set company_id = inv.company_id, role = inv.role, status = 'active' where id = auth.uid();
  update invites set status = 'accepted' where id = inv.id;
  return inv.company_id;
end;
$$;

grant execute on function accept_invite(uuid) to authenticated;
