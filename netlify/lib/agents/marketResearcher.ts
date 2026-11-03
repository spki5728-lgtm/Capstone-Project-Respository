// Market Researcher: checks the wider resale market with web search and recommends what to source and how to price it.
import type Anthropic from "@anthropic-ai/sdk";
import type { Metrics } from "../automation/metrics";
import { claude, MODEL, parseJsonReply } from "./claude";
import type { TrendReport } from "./trendAnalyst";

export type MarketResearch = {
  marketSummary: string;
  sourcing: { item: string; why: string; buyUnder: number; sellFor: number }[];
  pricing: { segment: string; advice: string }[];
  sources: { title: string; url: string }[];
  searchProblems: string[]; // error codes from web search, if it failed
};

const SYSTEM = `You are the Market Researcher for a Depop reseller. Using web search, you check what is in demand on resale apps right now and what comparable items sell for, then turn that into concrete sourcing and pricing advice for this seller.

Favor recent sources (this season). Compare the market with the seller's own prices and say where they are under- or over-pricing. Keep advice specific: name brands, item types and dollar amounts.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["marketSummary", "sourcing", "pricing"],
  properties: {
    marketSummary: {
      type: "string",
      description: "2 to 3 sentences on current resale demand relevant to this seller.",
    },
    sourcing: {
      type: "array",
      description: "3 to 5 items to source next, best opportunity first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "why", "buyUnder", "sellFor"],
        properties: {
          item: { type: "string" },
          why: { type: "string", description: "One sentence tying market demand to this seller's results." },
          buyUnder: { type: "number", description: "Maximum thrift/sourcing price in USD." },
          sellFor: { type: "number", description: "Realistic Depop listing price in USD." },
        },
      },
    },
    pricing: {
      type: "array",
      description: "2 to 4 pricing changes for the seller's existing categories or brands.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["segment", "advice"],
        properties: {
          segment: { type: "string", description: "Brand or category." },
          advice: { type: "string", description: "What to change, with a target price." },
        },
      },
    },
  },
};

export async function runMarketResearcher(
  metrics: Metrics,
  trends: TrendReport,
  today: string,
): Promise<MarketResearch> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Today is ${today}.

Seller's own numbers:
- Top brands: ${JSON.stringify(metrics.topBrands)}
- Categories: ${JSON.stringify(metrics.categories)}
- Average sale price: $${metrics.averagePrice}

Trend Analyst's findings:
${JSON.stringify(trends, null, 1)}

Research the current resale market for this seller and recommend what to source and how to price it.`,
    },
  ];

  // Web search can pause a long turn; resume it until Claude finishes.
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const research = parseJsonReply<Omit<MarketResearch, "sources" | "searchProblems">>(response);
    return { ...research, ...collectSearchResults(messages, response) };
  }
  throw new Error("Market research took too many steps.");
}

// The search results Claude read, deduplicated so the report can link to them, plus any search errors.
function collectSearchResults(messages: Anthropic.MessageParam[], last: Anthropic.Message) {
  const blocks = [
    ...messages.flatMap((message) => (Array.isArray(message.content) ? message.content : [])),
    ...last.content,
  ];
  const sources = new Map<string, string>();
  const searchProblems: string[] = [];
  for (const block of blocks) {
    if (block.type !== "web_search_tool_result") continue;
    if (Array.isArray(block.content)) {
      for (const result of block.content) sources.set(result.url, result.title);
    } else {
      searchProblems.push(block.content.error_code);
    }
  }
  return {
    sources: [...sources].slice(0, 8).map(([url, title]) => ({ url, title })),
    searchProblems,
  };
}
