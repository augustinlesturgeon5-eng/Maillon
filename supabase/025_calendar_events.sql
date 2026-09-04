-- Événements libres de l'agenda (pas forcément liés à une entreprise connectée)

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  note text,
  date date not null,
  time text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table calendar_events enable row level security;

create policy "Company members can view their events"
  on calendar_events for select to authenticated
  using (company_id = auth_company_id());

create policy "Company members can create events"
  on calendar_events for insert to authenticated
  with check (company_id = auth_company_id());

create policy "Company members can delete their events"
  on calendar_events for delete to authenticated
  using (company_id = auth_company_id());

alter publication supabase_realtime add table calendar_events;
