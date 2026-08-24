-- Invitations de visio en direct : permet de notifier l'autre entreprise et de rejoindre la même salle
create table visio_calls (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  from_company_id uuid not null references companies(id) on delete cascade,
  to_company_id uuid not null references companies(id) on delete cascade,
  services text[] not null,
  room text not null,
  created_at timestamptz default now()
);

alter table visio_calls enable row level security;

-- Chaque entreprise ne voit que les appels qui la concernent (envoyés ou reçus)
create policy "Companies can view their own visio calls"
  on visio_calls for select
  to authenticated
  using (from_company_id = auth_company_id() or to_company_id = auth_company_id());

-- On ne peut démarrer un appel qu'en son propre nom
create policy "Companies can start a visio call"
  on visio_calls for insert
  to authenticated
  with check (from_company_id = auth_company_id());

-- Nécessaire pour recevoir les invitations en direct (Realtime)
alter publication supabase_realtime add table visio_calls;
