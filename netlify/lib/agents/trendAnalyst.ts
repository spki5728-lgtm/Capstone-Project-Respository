// Trend Analyst: finds what sells, when, and at what price in this seller's own history.
// It also reviews the Forecaster's numbers against those trends (the "discernment" check).
import type { Sale } from "../automation/csv";
import type { Metrics, SellThrough } from "../automation/metrics";
import { askForJson, sellerData } from "./claude";
import type { Forecast } from "./forecaster";

export type TrendReport = {
  headline: string;
  trends: { title: string; detail: string }[];
  bestSellers: string[];
  slowMovers: string[];
};

const SYSTEM = `You are the Trend Analyst for a Depop reseller. You study their sales history and explain, in plain language a college student would use, what is selling, what isn't, and how that changes over time.

Ground every claim in the numbers you are given; cite the specific brand, category, price, or date range. Do not invent sales. If the history is short, say what it can and can't show.

If you are given sell-through rates (items sold ÷ items listed per category), use them: a high rate means demand outpaces what the seller lists (list more), a low rate means stock is piling up (list less, or lower prices). Weigh sell-through alongside revenue; a category can earn a lot yet sit unsold.`;

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

export async function runTrendAnalyst(
  metrics: Metrics,
  sales: Sale[],
  sellThrough: SellThrough | null,
): Promise<TrendReport> {
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
${sellerData(metrics)}

Individual sales (most recent ${recentSales.length}):
${sellerData(recentSales)}

${
  sellThrough
    ? `Sell-through (from the seller's own listing counts; rate is % of listed items that sold):\n${sellerData(sellThrough)}`
    : "The seller hasn't entered listing counts, so sell-through is unknown."
}

What are the trends in this seller's sales?`,
  });
}

export type ForecastReview = {
  verdict: "agrees" | "partly agrees" | "disagrees";
  confidence: "low" | "medium" | "high";
  summary: string;
  agreements: string[];
  concerns: string[];
  suggestedRevenue: number;
};

const REVIEW_SYSTEM = `You are the Trend Analyst for a Depop reseller, now acting as a skeptical second opinion on the Forecaster's 30-day forecast.

Check the forecast against the seller's actual history and the trends you found: is the expected number consistent with recent weekly sales, is the range honest, and are the Forecaster's stated drivers really supported by the data? Point out anything that looks optimistic, pessimistic, or unsupported. Be specific and use numbers. Disagreeing is fine when the data says so.`;

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "confidence", "summary", "agreements", "concerns", "suggestedRevenue"],
  properties: {
    verdict: { type: "string", enum: ["agrees", "partly agrees", "disagrees"] },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "How much the seller should trust the forecast.",
    },
    summary: { type: "string", description: "2 sentences: your overall judgment of the forecast." },
    agreements: { type: "array", items: { type: "string" }, description: "1 to 3 parts that hold up, with numbers." },
    concerns: {
      type: "array",
      items: { type: "string" },
      description: "0 to 3 parts that look off, with numbers. Empty if none.",
    },
    suggestedRevenue: {
      type: "number",
      description: "Your own expected 30-day revenue in USD. Same as the forecast if you agree.",
    },
  },
};

export async function reviewForecast(metrics: Metrics, trends: TrendReport, forecast: Forecast): Promise<ForecastReview> {
  return askForJson<ForecastReview>({
    system: REVIEW_SYSTEM,
    effort: "medium",
    schema: REVIEW_SCHEMA,
    prompt: `Weekly history: ${sellerData(metrics.weekly)}

Your trend findings: ${sellerData(trends)}

The Forecaster's 30-day forecast: ${sellerData(forecast)}

Does this forecast hold up?`,
  });
}
