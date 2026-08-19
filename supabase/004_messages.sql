-- Messages échangés entre deux entreprises connectées
create table messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  sender_company_id uuid not null references companies(id) on delete cascade,
  service text not null,
  body text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

-- On ne peut voir les messages que d'une mise en relation acceptée dont on fait partie
create policy "Connected companies can view their messages"
  on messages for select
  to authenticated
  using (
    connection_id in (
      select id from connections
      where (from_company_id = auth_company_id() or to_company_id = auth_company_id())
      and status = 'accepted'
    )
  );

-- Idem pour l'envoi, et uniquement en son propre nom
create policy "Connected companies can send messages"
  on messages for insert
  to authenticated
  with check (
    sender_company_id = auth_company_id()
    and connection_id in (
      select id from connections
      where (from_company_id = auth_company_id() or to_company_id = auth_company_id())
      and status = 'accepted'
    )
  );

-- Nécessaire pour recevoir les messages en direct (Realtime)
alter publication supabase_realtime add table messages;
