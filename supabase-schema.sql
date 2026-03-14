-- Run this in Supabase SQL editor to set up all tables

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  created_at timestamptz default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  key_hash text unique not null,
  key_prefix text not null,
  name text not null default 'Default',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  api_key_id uuid references api_keys(id) on delete set null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  credits_used integer not null default 0,
  upstream_provider text not null default 'openai',
  created_at timestamptz default now()
);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  tx_type text not null check (tx_type in ('deposit','burn','purchase','sale')),
  amount text not null,
  xrpl_tx_hash text not null default '',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_api_keys_hash on api_keys(key_hash);
create index if not exists idx_usage_logs_user on usage_logs(user_id, created_at desc);
create index if not exists idx_credit_tx_user on credit_transactions(user_id, created_at desc);
create index if not exists idx_credit_tx_hash on credit_transactions(xrpl_tx_hash) where xrpl_tx_hash != '';
