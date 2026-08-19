-- Relations de démarchage entre deux entreprises
create table connections (
  id uuid primary key default gen_random_uuid(),
  from_company_id uuid not null references companies(id) on delete cascade,
  to_company_id uuid not null references companies(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined
  service text,
  message text,
  emailing_opt_in boolean default false,
  emailing_addresses text[],
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique(from_company_id, to_company_id)
);

alter table connections enable row level security;

-- Les deux entreprises concernées peuvent voir la demande
create policy "Companies can view their own connections"
  on connections for select
  to authenticated
  using (
    from_company_id = auth_company_id()
    or to_company_id = auth_company_id()
  );

-- Seule l'entreprise émettrice peut envoyer une demande
create policy "Companies can send a connection request"
  on connections for insert
  to authenticated
  with check (from_company_id = auth_company_id());

-- Seule l'entreprise destinataire peut répondre (accepter/décliner)
create policy "Recipient company can respond"
  on connections for update
  to authenticated
  using (to_company_id = auth_company_id());
