import { MODEL_PRICING, CREDITS_PER_DOLLAR } from "@/types";

export function calculateCreditCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"];

  const promptCostUsd = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCostUsd = (completionTokens / 1_000_000) * pricing.completion;
  const totalUsd = promptCostUsd + completionCostUsd;

  return Math.ceil(totalUsd * CREDITS_PER_DOLLAR * 100) / 100;
}

export function creditsToRlusd(credits: number): number {
  return credits / CREDITS_PER_DOLLAR;
}

export function rlusdToCredits(rlusd: number): number {
  return rlusd * CREDITS_PER_DOLLAR;
}
