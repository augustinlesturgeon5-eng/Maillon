-- Journal d'accès : historique des actions sensibles, partagé entre collègues d'une même entreprise
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  text text not null,
  created_at timestamptz default now()
);

alter table audit_log enable row level security;

create policy "Company can view its own audit log"
  on audit_log for select
  to authenticated
  using (company_id = auth_company_id());

create policy "Company can log its own audit log"
  on audit_log for insert
  to authenticated
  with check (
    company_id = auth_company_id()
    and created_by = auth.uid()
  );

-- Nécessaire pour recevoir les entrées en direct (Realtime)
alter publication supabase_realtime add table audit_log;
