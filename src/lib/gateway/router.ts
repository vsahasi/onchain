import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type RouterResult = {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export async function routeToUpstream(
  model: string,
  messages: ChatMessage[],
  stream: boolean = false
): Promise<RouterResult> {
  const response = await openai.chat.completions.create({
    model,
    messages,
    stream: false,
  });

  return {
    id: response.id,
    model: response.model,
    choices: response.choices.map((c, i) => ({
      index: i,
      message: {
        role: c.message.role,
        content: c.message.content ?? "",
      },
      finish_reason: c.finish_reason ?? "stop",
    })),
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  };
}
