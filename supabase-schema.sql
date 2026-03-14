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
  -- if set, usage costs are billed to source_user_id (seller) not user_id (buyer)
  source_user_id uuid references users(id) on delete set null,
  -- if set, this key came from a marketplace purchase
  marketplace_listing_id uuid,
  created_at timestamptz default now()
);

-- Marketplace listings: sellers offer access to their credit pool
create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references users(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  -- price buyer pays in RLUSD to get one API key
  price_rlusd text not null,
  -- max credits buyer can consume via purchased key (0 = unlimited up to seller balance)
  credit_limit text not null default '0',
  -- max number of keys that can be purchased (0 = unlimited)
  max_purchases integer not null default 0,
  purchase_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Payment records for marketplace purchases
create table if not exists marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references marketplace_listings(id) on delete cascade not null,
  buyer_id uuid references users(id) on delete cascade not null,
  api_key_id uuid references api_keys(id) on delete set null,
  price_paid_rlusd text not null,
  xrpl_tx_hash text not null default '',
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
create index if not exists idx_api_keys_source_user on api_keys(source_user_id) where source_user_id is not null;
create index if not exists idx_usage_logs_user on usage_logs(user_id, created_at desc);
create index if not exists idx_credit_tx_user on credit_transactions(user_id, created_at desc);
create index if not exists idx_credit_tx_hash on credit_transactions(xrpl_tx_hash) where xrpl_tx_hash != '';
create index if not exists idx_marketplace_listings_seller on marketplace_listings(seller_id, created_at desc);
create index if not exists idx_marketplace_listings_active on marketplace_listings(is_active, created_at desc);
create index if not exists idx_marketplace_purchases_buyer on marketplace_purchases(buyer_id, created_at desc);
create index if not exists idx_marketplace_purchases_listing on marketplace_purchases(listing_id);
