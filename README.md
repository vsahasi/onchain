# openchain — Tokenized AI Inference Credits on XRPL

> Every month, people waste API credits. Providers bill monthly; you pay for more than you use. Unused credits expire—no refund, no transfer, no resale.

**openchain** is a marketplace on the XRP Ledger where AI inference credits are tokenized and tradeable. Buy only what you need. Sell what you don't use. No monthly lock-in, no wasted spend—all payments settle on-chain.

**Live Demo:** [openchain-hznqscjk1-vsahasi-3315s-projects.vercel.app](https://openchain-hznqscjk1-vsahasi-3315s-projects.vercel.app)

---

## How It Works

1. **Deposit XRP** → receive IFX inference credits (1 XRP = 100 IFX)
2. **Sell API access** → list your credit pool on the marketplace for a fixed RLUSD price
3. **Buy a listing** → pay via Crossmark wallet, receive an API key instantly
4. **Call AI models** → use any OpenAI SDK pointed at openchain — seller's credits debit per token
5. **All payments settle on XRPL Testnet** — fully verifiable, no custodian

**Why blockchain?** Credits become assets you own. You can resell them. Buyers pay exactly for what they get. Every debit is transparent and auditable on-chain—no black-box billing.

---

## Run Locally

### Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | |
| [Crossmark](https://crossmark.io) browser extension | Switch to XRPL Testnet (Ripple) |
| Supabase project | Free tier works fine |
| OpenAI API key | Any tier |

### 1. Clone and install

```bash
git clone https://github.com/vsahasi/onchain.git
cd onchain
npm install
```

### 2. Environment variables

Create a `.env.local` file in the project root:

```bash
# XRPL
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
NEXT_PUBLIC_XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_PLATFORM_SEED=<your testnet wallet seed>
NEXT_PUBLIC_PLATFORM_ADDRESS=<rAddress matching the seed>
RLUSD_ISSUER=rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV
NEXT_PUBLIC_RLUSD_ISSUER=rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV
CREDIT_CURRENCY=IFX

# OpenAI (upstream LLM)
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
JWT_SECRET=<64-char random hex — run: openssl rand -hex 32>
```

> **Get a free funded XRPL Testnet wallet:**
> Visit [faucet.altnet.rippletest.net](https://faucet.altnet.rippletest.net) — it returns an `rAddress` and a secret seed. Use the seed as `XRPL_PLATFORM_SEED`.

### 3. Set up the database

In your Supabase project → **SQL Editor** → paste and run the full contents of [`supabase-schema.sql`](./supabase-schema.sql).

This creates tables for: `users`, `api_keys`, `usage_logs`, `credit_transactions`, `marketplace_listings`, `marketplace_purchases`.

### 4. Run the dev server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

### 5. Connect a wallet

- Open Crossmark → Settings → switch network to **Testnet (Ripple)**
- Click **Connect Wallet** in the app
- If your wallet isn't funded, visit the faucet above

---

## Using the API Gateway

The gateway is a **drop-in replacement for the OpenAI SDK**. Any key issued or purchased on openchain works here.

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/v1",
    api_key="infx_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello from openchain!"}]
)

print(response.choices[0].message.content)
print(f"Credits used: {response.usage.credits_used}")
```

```bash
# curl
curl http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer infx_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello!"}]}'
```

### Available models

| Model | Approx. IFX per request |
|---|---|
| `gpt-4o` | ~18 |
| `gpt-4o-mini` | ~5 |
| `gpt-4.1` | ~22 |
| `gpt-4.1-mini` | ~8 |
| `gpt-4.1-nano` | ~3 |

---

## Architecture

```
Browser (Next.js App Router)
  ├── /            Dashboard — balances, API config, recent usage
  ├── /marketplace Browse/buy listings, sell your own access, purchase history
  └── /deposit     Send XRP → receive IFX credits

API Routes
  ├── /api/auth                     Crossmark wallet auth → JWT + API key
  ├── /api/credits/balance          On-chain IFX + RLUSD balance lookup
  ├── /api/credits/deposit          Verify XRP tx on ledger → issue IFX credits
  ├── /api/marketplace/listings     CRUD for marketplace listings
  ├── /api/marketplace/purchase     Verify RLUSD payment → issue buyer API key
  ├── /api/xrpl/prepare             Server-side tx autofill (Sequence, Fee, LLS)
  ├── /api/xrpl/submit              Submit signed tx_blob, return hash + result
  └── /api/v1/chat/completions      OpenAI-compatible gateway — debits seller credits

Infrastructure
  ├── Supabase (Postgres)   users, keys, usage, transactions, listings, purchases
  ├── XRPL Testnet          IFX issued currency, XRP/RLUSD payments, on-chain verify
  └── OpenAI                upstream LLM (model-routed, swappable)
```

### Marketplace purchase flow

```
1. Buyer clicks "Buy for X RLUSD"
2. Crossmark signs & submits a Payment tx (RLUSD → platform address)
3. POST /api/marketplace/purchase with { listing_id, tx_hash }
4. Server calls XRPL `tx` RPC — verifies type, destination, sender, amount, tesSUCCESS
5. New api_key row created with source_user_id = seller
6. Raw key returned once to buyer (never stored plaintext)
7. Buyer uses key as Bearer token on /api/v1/chat/completions
8. Gateway debits SELLER's IFX balance per token usage
```

---

## XRPL Features Used

| Feature | Usage |
|---|---|
| Issued Currency (IFX tokens) | Platform issues IFX via trust lines as inference credits |
| RLUSD Stablecoin | Marketplace purchase payments |
| Payment transactions | XRP deposits + RLUSD marketplace buys |
| `account_lines` RPC | Read IFX + RLUSD balances |
| `tx` RPC | On-chain payment verification before issuing keys |
| Crossmark SDK | Browser wallet signing — zero private keys in frontend |

---

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4 + shadcn/ui**
- **xrpl.js** — XRPL node interaction
- **@crossmarkio/sdk** — browser wallet
- **Supabase** — Postgres
- **jose** — JWT (edge-compatible)
- **OpenAI SDK** — upstream LLM routing

---

## License

MIT
