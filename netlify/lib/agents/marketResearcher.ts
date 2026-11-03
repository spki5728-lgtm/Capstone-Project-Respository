// Market Researcher: checks the wider resale market with web search and recommends what to source and how to price it.
// Two calls: first research freely with web search, then turn the notes into structured advice.
// (Asking for JSON in the same call as web search makes Claude skip searching.)
import type Anthropic from "@anthropic-ai/sdk";
import type { Metrics } from "../automation/metrics";
import { askForJson, claude, MODEL } from "./claude";
import type { TrendReport } from "./trendAnalyst";

export type MarketResearch = {
  marketSummary: string;
  sourcing: { item: string; why: string; buyUnder: number; sellFor: number }[];
  pricing: { segment: string; advice: string }[];
  sources: { title: string; url: string }[];
  searchProblems: string[]; // error codes from web search, if it failed
};

const RESEARCH_SYSTEM = `You are the Market Researcher for a Depop reseller. Use web search to check what is in demand on resale apps right now and what comparable items sell for.

Favor recent sources from this season. Write concise research notes: for each brand or item type that matters to this seller, note current demand and typical sold prices in USD, and which source each fact came from. Then list any rising items the seller doesn't sell yet but could source cheaply.`;

const ADVICE_SYSTEM = `You are the Market Researcher for a Depop reseller. Turn your research notes into concrete sourcing and pricing advice for this seller. Compare the market with the seller's own prices and say where they are under- or over-pricing. Name brands, item types and dollar amounts. Only state market prices that appear in the notes; if the notes are thin, say so in the summary.`;

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
  const sellerContext = `Today is ${today}.

Seller's own numbers:
- Top brands: ${JSON.stringify(metrics.topBrands)}
- Categories: ${JSON.stringify(metrics.categories)}
- Average sale price: $${metrics.averagePrice}

Trend Analyst's findings:
${JSON.stringify(trends, null, 1)}`;

  const { notes, sources, searchProblems } = await research(sellerContext);

  const advice = await askForJson<Omit<MarketResearch, "sources" | "searchProblems">>({
    system: ADVICE_SYSTEM,
    effort: "low",
    schema: SCHEMA,
    prompt: `${sellerContext}

Your research notes:
${notes}

Write the sourcing and pricing advice.`,
  });

  return { ...advice, sources, searchProblems };
}

async function research(sellerContext: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${sellerContext}\n\nResearch the current resale market for this seller.` },
  ];

  // Web search can pause a long turn; resume it until Claude finishes.
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await claude().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: RESEARCH_SYSTEM,
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      output_config: { effort: "low" },
    });
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason === "refusal") throw new Error("Claude declined to answer this request.");

    const notes = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    return { notes, ...collectSearchResults(messages) };
  }
  throw new Error("Market research took too many steps.");
}

// The search results Claude read, deduplicated so the report can link to them, plus any search errors.
function collectSearchResults(messages: Anthropic.MessageParam[]) {
  const sources = new Map<string, string>();
  const searchProblems: string[] = [];
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block.type !== "web_search_tool_result") continue;
      if (Array.isArray(block.content)) {
        for (const result of block.content) sources.set(result.url, result.title);
      } else {
        searchProblems.push(block.content.error_code);
      }
    }
  }
  return {
    sources: [...sources].slice(0, 8).map(([url, title]) => ({ url, title })),
    searchProblems,
  };
}
