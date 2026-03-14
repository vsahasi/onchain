# InferX — Tokenized Inference Credits on XRPL

A marketplace for tokenized AI inference credits built on the XRP Ledger. Users deposit RLUSD stablecoin to receive INFX credits, trade unused credits at a discount on XRPL's native DEX, and redeem them through an OpenAI-compatible API gateway.

## XRPL Features Used

- **RLUSD Stablecoin** — payment currency for credit purchases
- **Issued Currencies + Trust Lines** — INFX inference credits as XRPL tokens
- **Native DEX (OfferCreate)** — fully on-chain orderbook for credit marketplace
- **Token Escrow (XLS-85)** — conditional settlement for deposits

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│  Dashboard │ Marketplace │ Deposit                      │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼────────────────────┐
│  API Layer                                              │
│  /api/auth  │ /api/credits/* │ /api/marketplace         │
│  /api/v1/chat/completions (OpenAI-compatible)           │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
  ┌────▼────┐   ┌─────▼─────┐  ┌────▼────────┐
  │Supabase │   │   XRPL    │  │  Upstream   │
  │  (DB)   │   │  Testnet  │  │ LLM (OpenAI)│
  └─────────┘   └───────────┘  └─────────────┘
```

## How It Works

1. **Connect** your XRPL wallet (Crossmark or manual address)
2. **Deposit** RLUSD to the platform address → receive INFX credits (1 RLUSD = 100 INFX)
3. **Trade** unused credits on the XRPL native DEX at a discount
4. **Use** credits through the OpenAI-compatible API gateway
5. Credits are **burned** after each API call based on token usage

## Setup

### Prerequisites

- Node.js 20+
- An XRPL Testnet wallet (get one at [faucet.altnet.rippletest.net](https://faucet.altnet.rippletest.net))
- A Supabase project
- An OpenAI API key (for upstream LLM access)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local` and fill in:

```
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_PLATFORM_SEED=<your testnet wallet seed>
RLUSD_ISSUER=rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV
CREDIT_CURRENCY=INFX
OPENAI_API_KEY=<your OpenAI key>
NEXT_PUBLIC_SUPABASE_URL=<your Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>
JWT_SECRET=<random secret string>
NEXT_PUBLIC_PLATFORM_ADDRESS=<your platform wallet rAddress>
```

### 3. Set up the database

Run the migration SQL in your Supabase project (or it was already applied via MCP):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used NUMERIC NOT NULL,
  upstream_provider TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('deposit', 'burn', 'purchase', 'sale')),
  amount NUMERIC NOT NULL,
  xrpl_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Gateway Usage

The gateway is OpenAI SDK-compatible. Replace your base URL and API key:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/v1",
    api_key="infx_your_api_key_here"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
print(f"Credits used: {response.usage.credits_used}")
```

### Available Models

| Model | Prompt (per 1M tokens) | Completion (per 1M tokens) |
|-------|----------------------|---------------------------|
| gpt-4o | $0.25 | $1.00 |
| gpt-4o-mini | $0.015 | $0.06 |
| gpt-4.1 | $0.20 | $0.80 |
| gpt-4.1-mini | $0.04 | $0.16 |
| gpt-4.1-nano | $0.01 | $0.04 |

## Tech Stack

- **Next.js 16** (App Router) — frontend + API routes
- **Tailwind CSS + shadcn/ui** — UI components
- **xrpl.js** — XRPL blockchain interaction
- **Supabase** — PostgreSQL database
- **OpenAI SDK** — upstream LLM routing

## License

MIT
