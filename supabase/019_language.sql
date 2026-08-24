-- Langue préférée de l'utilisateur
alter table profiles add column language text not null default 'fr';
