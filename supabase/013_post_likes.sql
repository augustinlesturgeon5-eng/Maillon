-- "J'aime" sur les actualités : un like par entreprise et par publication
create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, company_id)
);

alter table post_likes enable row level security;

-- Les compteurs de likes sont publics, comme le fil d'actualité
create policy "Post likes are publicly readable"
  on post_likes for select
  using (true);

-- On ne peut liker qu'en son propre nom
create policy "Company can like a post"
  on post_likes for insert
  to authenticated
  with check (company_id = auth_company_id());

-- On ne peut retirer que son propre like
create policy "Company can unlike a post"
  on post_likes for delete
  to authenticated
  using (company_id = auth_company_id());

-- Nécessaire pour recevoir les likes en direct (Realtime)
alter publication supabase_realtime add table post_likes;
