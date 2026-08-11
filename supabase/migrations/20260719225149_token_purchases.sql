create table if not exists token_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  amount integer not null,
  impact_amount integer not null,
  allocation_amount integer not null,
  price_usd numeric(10,2) not null,
  stripe_payment_intent_id text unique,
  stripe_session_id text,
  status text not null default 'paid',
  wallet_address text,
  minted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table token_purchases enable row level security;

create policy "Users can view own purchases"
  on token_purchases for select
  using (auth.uid() = user_id);

create policy "Service role can insert purchases"
  on token_purchases for insert
  with check (true);
