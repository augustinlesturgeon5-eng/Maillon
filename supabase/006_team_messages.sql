-- Messages du chat interne (canal Général + messages privés entre collègues)
create table team_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  channel text not null default 'general',
  body text not null,
  created_at timestamptz default now()
);

alter table team_messages enable row level security;

-- On ne peut voir que les messages de sa propre entreprise
create policy "Team can view its own messages"
  on team_messages for select
  to authenticated
  using (company_id = auth_company_id());

-- On ne peut envoyer que dans sa propre entreprise, en son propre nom
create policy "Team can send its own messages"
  on team_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and company_id = auth_company_id()
  );

-- Nécessaire pour recevoir les messages en direct (Realtime)
alter publication supabase_realtime add table team_messages;
