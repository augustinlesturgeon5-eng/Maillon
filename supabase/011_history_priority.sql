-- Distingue les démarches prioritaires (Bibliothèque) des actions secondaires (cloche de notifications)
alter table history_log add column priority boolean not null default false;
