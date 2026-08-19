-- Entreprises inscrites sur Maillon
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  loc text,
  emp text,
  founded text,
  ca text,
  dispo text,
  web text,
  siret text,
  verified boolean default false,
  verified_siren boolean default false,
  color text,
  logo_url text,
  description text,
  seek text[],
  offer text[],
  certifs text[],
  langues text[],
  services text[],
  reception_pole text,
  plan_id text default 'gratuit',
  billing text,
  created_at timestamptz default now()
);

alter table companies enable row level security;

-- Tout le monde peut consulter l'annuaire des entreprises
create policy "Companies are publicly readable"
  on companies for select
  using (true);

-- Seul un utilisateur connecté peut créer une entreprise
create policy "Authenticated users can create a company"
  on companies for insert
  to authenticated
  with check (true);

-- Comptes utilisateurs, reliés à une entreprise
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  full_name text,
  role text default 'Direction',
  status text default 'active',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- On ne peut modifier que sa propre entreprise
create policy "Company members can update their company"
  on companies for update
  to authenticated
  using (id in (select company_id from profiles where id = auth.uid()));

-- Un utilisateur voit son propre profil et ceux de ses collègues
create policy "Users can view their own profile and teammates"
  on profiles for select
  to authenticated
  using (
    id = auth.uid()
    or company_id in (select company_id from profiles where id = auth.uid())
  );

-- Un utilisateur ne peut modifier que son propre profil
create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- Création automatique du profil dès qu'un compte s'inscrit
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
