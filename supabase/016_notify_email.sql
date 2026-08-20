-- Préférence de notification par e-mail, par compte
alter table profiles add column notify_email boolean not null default true;
