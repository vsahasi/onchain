import { createClient } from "@supabase/supabase-js";

// Server-side client (service role — never expose to browser)
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Browser-safe client (anon key)
export function getBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type User = {
  id: string;
  wallet_address: string;
  created_at: string;
};

export type ApiKey = {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type UsageLog = {
  id: string;
  user_id: string;
  api_key_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  credits_used: number;
  upstream_provider: string;
  created_at: string;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  tx_type: "deposit" | "burn" | "purchase" | "sale";
  amount: string;
  xrpl_tx_hash: string;
  created_at: string;
};
