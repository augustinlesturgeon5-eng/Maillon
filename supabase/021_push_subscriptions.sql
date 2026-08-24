-- Abonnements aux notifications push du navigateur, par compte
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions"
  on push_subscriptions for select
  to authenticated
  using (profile_id = auth.uid());

create policy "Users can create their own push subscriptions"
  on push_subscriptions for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "Users can delete their own push subscriptions"
  on push_subscriptions for delete
  to authenticated
  using (profile_id = auth.uid());
