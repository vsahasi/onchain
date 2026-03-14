import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_MAP: Record<string, string> = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
};

export async function routeRequest(
  model: string,
  messages: { role: string; content: string }[],
  temperature?: number,
  maxTokens?: number
) {
  const upstreamModel = MODEL_MAP[model] || "gpt-4o-mini";

  const response = await openai.chat.completions.create({
    model: upstreamModel,
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens,
  });

  return {
    id: response.id,
    object: response.object,
    created: response.created,
    model: response.model,
    choices: response.choices.map((c) => ({
      index: c.index,
      message: {
        role: c.message.role,
        content: c.message.content || "",
      },
      finish_reason: c.finish_reason || "stop",
    })),
    usage: {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
    },
    upstreamProvider: "openai",
  };
}
