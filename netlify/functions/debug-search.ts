// TEMPORARY: checks whether web search works through AI Gateway. Delete after testing.
import { claude, MODEL } from "../lib/agents/claude";

export default async () => {
  try {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: "Use web search to find one current article about Depop resale trends. Reply with its title." }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }],
      output_config: { effort: "low" },
    });
    return Response.json({
      stop_reason: response.stop_reason,
      blocks: response.content.map((block) =>
        block.type === "text" ? { type: "text", text: block.text.slice(0, 300) } : { type: block.type },
      ),
      usage: response.usage,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

export const config = { path: "/api/debug-search" };
