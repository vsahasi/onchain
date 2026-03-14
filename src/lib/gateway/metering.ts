/**
 * Calculates credit cost from token usage.
 * 1 INFX credit = $0.01 USD of inference.
 * Rates below are approximate per-token costs in USD.
 */

const MODEL_RATES: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.000005, completion: 0.000015 },
  "gpt-4o-mini": { prompt: 0.00000015, completion: 0.0000006 },
  "gpt-4-turbo": { prompt: 0.00001, completion: 0.00003 },
  "gpt-3.5-turbo": { prompt: 0.0000005, completion: 0.0000015 },
};

const CREDITS_PER_USD = 100; // 1 INFX = $0.01

export function calculateCreditCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const rates = MODEL_RATES[model] ?? MODEL_RATES["gpt-4o-mini"];
  const usdCost =
    promptTokens * rates.prompt + completionTokens * rates.completion;
  // Round up to nearest credit
  return Math.max(1, Math.ceil(usdCost * CREDITS_PER_USD));
}
