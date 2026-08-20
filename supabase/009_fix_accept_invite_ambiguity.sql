-- Corrige une erreur "column reference full_name is ambiguous" :
-- le paramètre de la fonction avait le même nom que la colonne de la table.
drop function if exists accept_invite(uuid, text);

create or replace function accept_invite(invite_token uuid, new_full_name text default null)
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
  update profiles set
    company_id = inv.company_id,
    role = inv.role,
    status = 'active',
    full_name = coalesce(nullif(trim(new_full_name), ''), profiles.full_name)
  where id = auth.uid();
  update invites set status = 'accepted' where id = inv.id;
  return inv.company_id;
end;
$$;

grant execute on function accept_invite(uuid, text) to authenticated;
