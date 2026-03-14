# XRPL Inference Credit Marketplace — Claude Instructions

## Project
Tokenized API key marketplace on XRPL. Users deposit RLUSD → receive INFX credits → sell on DEX → burn credits per LLM API call.

## Stack
- Framework: Next.js 14 App Router
- Styling: Tailwind CSS + shadcn/ui
- Blockchain: XRPL Testnet via xrpl.js
- Wallet: Crossmark SDK
- DB: Supabase (Postgres)
- LLM routing: OpenAI SDK

## Key Env Vars
```
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_PLATFORM_SEED=<platform issuer wallet seed>
RLUSD_ISSUER=rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV
CREDIT_CURRENCY=INFX
OPENAI_API_KEY=<upstream key>
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
```

## Architecture Rules
- Platform wallet is the INFX issuer — never expose its seed client-side
- Users establish trust lines before receiving credits (handled in deposit flow)
- Credit burn = Payment from user custodial balance back to issuer
- DEX orderbook = `book_offers` RPC, no custom indexer
- API keys are hashed (SHA-256) before storing in DB; shown to user once
- JWT sessions tied to wallet address via signed nonce

## Code Standards
- All XRPL interactions go through `src/lib/xrpl/` helpers — never inline xrpl.js calls in routes
- API routes must validate API key or JWT before touching DB/XRPL
- Use `BigNumber` or string math for token amounts — no floating point
- Keep route handlers thin; business logic in lib/

## Workflow
- Plan before implementing non-trivial features
- TDD: write test stub → implement → pass
- Commit per logical chunk
- Never commit .env, seeds, or private keys
- Never force-push main

## Token Economics
- 1 INFX = $0.01 USD of inference
- Deposit: 100 RLUSD → 10,000 INFX (1:100)
- DEX: sellers list at discount (e.g. 10,000 INFX for 80 RLUSD)
- Gateway burn rate: calculated from (prompt_tokens + completion_tokens) × model rate
