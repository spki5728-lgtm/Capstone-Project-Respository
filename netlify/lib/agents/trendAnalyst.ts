// Trend Analyst: finds what sells, when, and at what price in this seller's own history.
import type { Sale } from "../automation/csv";
import type { Metrics } from "../automation/metrics";
import { askForJson } from "./claude";

export type TrendReport = {
  headline: string;
  trends: { title: string; detail: string }[];
  bestSellers: string[];
  slowMovers: string[];
};

const SYSTEM = `You are the Trend Analyst for a Depop reseller. You study their sales history and explain, in plain language a college student would use, what is selling, what isn't, and how that changes over time.

Ground every claim in the numbers you are given; cite the specific brand, category, price, or date range. Do not invent sales. If the history is short, say what it can and can't show.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "trends", "bestSellers", "slowMovers"],
  properties: {
    headline: { type: "string", description: "One sentence: the single most important takeaway." },
    trends: {
      type: "array",
      description: "3 to 5 trends, most important first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: {
          title: { type: "string", description: "Short label, under 8 words." },
          detail: { type: "string", description: "1 to 2 sentences with the supporting numbers." },
        },
      },
    },
    bestSellers: {
      type: "array",
      items: { type: "string" },
      description: "Brands, categories or item types that sell best, with a short reason each.",
    },
    slowMovers: {
      type: "array",
      items: { type: "string" },
      description: "What sells poorly or cheaply, with a short reason each. Empty if nothing stands out.",
    },
  },
};

export async function runTrendAnalyst(metrics: Metrics, sales: Sale[]): Promise<TrendReport> {
  const recentSales = sales.slice(-400).map(({ date, brand, category, size, price, description }) => ({
    date,
    brand,
    category,
    size,
    price,
    description,
  }));

  return askForJson<TrendReport>({
    system: SYSTEM,
    effort: "medium",
    schema: SCHEMA,
    prompt: `Summary metrics (refunds excluded):
${JSON.stringify(metrics, null, 1)}

Individual sales (most recent ${recentSales.length}):
${JSON.stringify(recentSales)}

What are the trends in this seller's sales?`,
  });
}
