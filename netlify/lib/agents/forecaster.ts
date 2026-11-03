// Forecaster: projects the next 30 days of sales from the seller's history, trends and market research.
import type { Metrics } from "../automation/metrics";
import { askForJson } from "./claude";
import type { MarketResearch } from "./marketResearcher";
import type { TrendReport } from "./trendAnalyst";

export type Forecast = {
  revenue: { low: number; expected: number; high: number };
  itemsSold: { low: number; expected: number; high: number };
  summary: string;
  drivers: string[];
  risks: string[];
};

export type Baseline = { recentWeeks: number; averageWeeklyRevenue: number; averageWeeklyItems: number };

const SYSTEM = `You are the Forecaster for a Depop reseller. You estimate their sales for the next 30 days.

Start from the baseline computed from their recent weekly sales, then adjust for the season, the trends, and the market research. Explain each adjustment in plain language. Give an honest low-to-high range; a short or bumpy history means a wider range.`;

const RANGE = {
  type: "object",
  additionalProperties: false,
  required: ["low", "expected", "high"],
  properties: { low: { type: "number" }, expected: { type: "number" }, high: { type: "number" } },
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["revenue", "itemsSold", "summary", "drivers", "risks"],
  properties: {
    revenue: { ...RANGE, description: "Gross revenue in USD for the next 30 days." },
    itemsSold: { ...RANGE, description: "Items sold in the next 30 days." },
    summary: { type: "string", description: "2 sentences: the forecast and the main reason." },
    drivers: {
      type: "array",
      items: { type: "string" },
      description: "2 to 4 things pushing the forecast up or down from the baseline, with rough size.",
    },
    risks: { type: "array", items: { type: "string" }, description: "1 to 3 things that could make it miss." },
  },
};

// Plain-math starting point: the average of the most recent weeks (up to 8), scaled to 30 days by the agent.
export function baselineFrom(metrics: Metrics): Baseline {
  const recent = metrics.weekly.slice(-8);
  const weeks = Math.max(recent.length, 1);
  return {
    recentWeeks: recent.length,
    averageWeeklyRevenue: Math.round((recent.reduce((total, week) => total + week.revenue, 0) / weeks) * 100) / 100,
    averageWeeklyItems: Math.round((recent.reduce((total, week) => total + week.itemsSold, 0) / weeks) * 10) / 10,
  };
}

export async function runForecaster(
  metrics: Metrics,
  trends: TrendReport,
  research: MarketResearch,
  today: string,
): Promise<Forecast> {
  const { sources, ...researchFindings } = research;

  return askForJson<Forecast>({
    system: SYSTEM,
    effort: "medium",
    schema: SCHEMA,
    prompt: `Today is ${today}. Forecast the 30 days starting today.

Baseline from the last weeks of sales: ${JSON.stringify(baselineFrom(metrics))}
(30 days is about 4.3 weeks.)

Weekly history: ${JSON.stringify(metrics.weekly)}
Last sale in the data: ${metrics.lastSale}

Trend Analyst: ${JSON.stringify(trends)}

Market Researcher: ${JSON.stringify(researchFindings)}`,
  });
}
