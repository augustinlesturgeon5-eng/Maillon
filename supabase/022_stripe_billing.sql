-- Facturation Stripe : identifiants client/abonnement, par entreprise
alter table companies add column stripe_customer_id text;
alter table companies add column stripe_subscription_id text;
alter table companies add column subscription_status text;
