// Shared Claude client for the agents. Credentials come from Netlify AI Gateway.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

type Effort = "low" | "medium" | "high";

// Sends one request and returns the JSON object Claude wrote, shaped by `schema`.
export async function askForJson<T>(options: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort: Effort;
}): Promise<T> {
  const response = await claude().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: options.system,
    messages: [{ role: "user", content: options.prompt }],
    output_config: { effort: options.effort, format: { type: "json_schema", schema: options.schema } },
  });
  return parseJsonReply<T>(response);
}

export function parseJsonReply<T>(response: Anthropic.Message): T {
  if (response.stop_reason === "refusal") throw new Error("Claude declined to answer this request.");
  if (response.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off.");
  const text = response.content.findLast((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("Claude didn't return an answer.");
  return JSON.parse(text.text) as T;
}
