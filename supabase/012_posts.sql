-- Actualités : fil de publications public entre toutes les entreprises du réseau
create table posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  repost_of_company_id uuid references companies(id) on delete set null,
  title text not null,
  body text,
  tag text default 'Actu',
  photo text,
  created_at timestamptz default now()
);

alter table posts enable row level security;

-- Le fil d'actualité est public, comme l'annuaire des entreprises
create policy "Posts are publicly readable"
  on posts for select
  using (true);

-- On ne peut publier qu'en son propre nom
create policy "Company can publish its own posts"
  on posts for insert
  to authenticated
  with check (company_id = auth_company_id());

-- Nécessaire pour recevoir les nouvelles publications en direct (Realtime)
alter publication supabase_realtime add table posts;
