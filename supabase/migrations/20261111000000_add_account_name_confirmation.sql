-- Keep existing accounts active; only newly created accounts need onboarding.
alter table public.auth_accounts add column name_confirmed_at timestamptz;
update public.auth_accounts set name_confirmed_at = now();

comment on column public.auth_accounts.name_confirmed_at is
  'When the account name was confirmed during sign-up; null requires onboarding.';
