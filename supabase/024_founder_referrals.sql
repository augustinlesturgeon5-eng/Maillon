-- Offre Fondateur : parrainage entre entreprises, mois offerts, statut fondateur

alter table companies add column is_founder boolean not null default false;
alter table companies add column invited_by uuid references companies(id);
alter table companies add column founder_free_until timestamptz;
alter table companies add column founder_months_granted int not null default 0;

create table referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_company_id uuid not null references companies(id) on delete cascade,
  invited_email text not null,
  invited_name text,
  code text not null unique,
  status text not null default 'pending', -- pending | clicked | registered | accepted
  reward_granted boolean not null default false,
  created_at timestamptz default now(),
  clicked_at timestamptz,
  registered_at timestamptz,
  accepted_at timestamptz
);
alter table referrals enable row level security;

create policy "Inviter company can view its referrals"
  on referrals for select to authenticated
  using (inviter_company_id = auth_company_id());
create policy "Inviter company can create referrals"
  on referrals for insert to authenticated
  with check (inviter_company_id = auth_company_id());

-- Lire une invitation par code (accessible avant inscription)
create or replace function get_referral(ref_code text)
returns table(inviter_company_id uuid, inviter_name text, status text)
language sql security definer as $$
  select r.inviter_company_id, c.name, r.status
  from referrals r join companies c on c.id = r.inviter_company_id
  where r.code = ref_code and r.status in ('pending','clicked','registered');
$$;

-- Marquer un lien comme cliqué (avant inscription)
create or replace function mark_referral_clicked(ref_code text)
returns void language sql security definer as $$
  update referrals set status='clicked', clicked_at=coalesce(clicked_at, now())
  where code=ref_code and status='pending';
$$;

-- Valider l'invitation à la création de compte : ne récompense que celui qui a invité
create or replace function accept_referral(ref_code text, new_company_id uuid)
returns void language plpgsql security definer as $$
declare inviter uuid;
begin
  select inviter_company_id into inviter from referrals
    where code=ref_code and status in ('pending','clicked','registered') and not reward_granted;
  if inviter is null then return; end if;

  update referrals set status='accepted', accepted_at=now(), reward_granted=true
    where code=ref_code;

  -- l'entreprise invitée : juste une trace de qui l'a invitée, aucun avantage
  update companies set invited_by=inviter where id=new_company_id;

  -- celui qui a invité : +1 mois offert et badge Entreprise Fondatrice
  update companies set
    is_founder=true,
    founder_free_until=greatest(coalesce(founder_free_until, now()), now())+interval '1 month',
    founder_months_granted=founder_months_granted+1
    where id=inviter;
end;
$$;
