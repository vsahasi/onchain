export interface User {
  id: string;
  wallet_address: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface UsageLog {
  id: string;
  user_id: string;
  api_key_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  credits_used: number;
  upstream_provider: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  tx_type: "deposit" | "burn" | "purchase" | "sale";
  amount: number;
  xrpl_tx_hash: string | null;
  created_at: string;
}

export interface OrderBookEntry {
  account: string;
  taker_gets: { currency: string; issuer: string; value: string } | string;
  taker_pays: { currency: string; issuer: string; value: string } | string;
  sequence: number;
  quality: string;
}

export interface CreditBalance {
  wallet_address: string;
  infx_balance: string;
  rlusd_balance: string;
}

export interface GatewayRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GatewayResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    credits_used: number;
  };
}

export const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.25, completion: 1.0 },
  "gpt-4o-mini": { prompt: 0.015, completion: 0.06 },
  "gpt-4.1": { prompt: 0.2, completion: 0.8 },
  "gpt-4.1-mini": { prompt: 0.04, completion: 0.16 },
  "gpt-4.1-nano": { prompt: 0.01, completion: 0.04 },
};

export const CREDITS_PER_DOLLAR = 100;
