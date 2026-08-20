-- Campagnes d'emailing
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  subject text not null,
  body text,
  html text,
  needs_rsvp boolean default false,
  recipients jsonb not null default '[]', -- [{id, name}]
  rsvp jsonb, -- [{companyId, name, status}]
  created_at timestamptz default now()
);

alter table campaigns enable row level security;

create policy "Company can view its own campaigns"
  on campaigns for select to authenticated
  using (company_id = auth_company_id());

create policy "Company can create its own campaigns"
  on campaigns for insert to authenticated
  with check (company_id = auth_company_id());

create policy "Company can update its own campaigns"
  on campaigns for update to authenticated
  using (company_id = auth_company_id());

-- Listes de diffusion
create table distribution_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  company_ids jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table distribution_lists enable row level security;

create policy "Company can view its own lists"
  on distribution_lists for select to authenticated
  using (company_id = auth_company_id());

create policy "Company can create its own lists"
  on distribution_lists for insert to authenticated
  with check (company_id = auth_company_id());

create policy "Company can delete its own lists"
  on distribution_lists for delete to authenticated
  using (company_id = auth_company_id());
