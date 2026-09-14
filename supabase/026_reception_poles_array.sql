-- Autorise plusieurs pôles à recevoir les demandes de mise en relation (au lieu d'un seul)

alter table companies add column reception_poles text[];

update companies set reception_poles = array[reception_pole] where reception_pole is not null;
update companies set reception_poles = array['Direction'] where reception_poles is null;

alter table companies alter column reception_poles set default array['Direction']::text[];
alter table companies alter column reception_poles set not null;

alter table companies drop column reception_pole;
