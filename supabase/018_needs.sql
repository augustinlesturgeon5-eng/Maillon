-- Mur de besoins : publications publiques + suivi des réponses (une par entreprise et par besoin)
create table needs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  sought text not null,
  loc text,
  created_at timestamptz default now()
);

alter table needs enable row level security;

create policy "Needs are publicly readable"
  on needs for select
  using (true);

create policy "Company can publish its own needs"
  on needs for insert
  to authenticated
  with check (company_id = auth_company_id());

create table need_responses (
  need_id uuid not null references needs(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (need_id, company_id)
);

alter table need_responses enable row level security;

create policy "Need responses are publicly readable"
  on need_responses for select
  using (true);

create policy "Company can respond to a need"
  on need_responses for insert
  to authenticated
  with check (company_id = auth_company_id());

-- Nécessaire pour recevoir les nouveaux besoins et réponses en direct (Realtime)
alter publication supabase_realtime add table needs;
alter publication supabase_realtime add table need_responses;
