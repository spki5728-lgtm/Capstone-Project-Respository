// Runs the three agents in order and saves progress to Netlify Blobs after each one.
import { getStore } from "@netlify/blobs";
import { runForecaster, type Forecast } from "../agents/forecaster";
import { runMarketResearcher, type MarketResearch } from "../agents/marketResearcher";
import { reviewForecast, runTrendAnalyst, type ForecastReview, type TrendReport } from "../agents/trendAnalyst";
import { loadFeedback } from "./feedback";
import { calculateSellThrough } from "./metrics";
import { loadListings, loadSales, loadUpload } from "./storage";

type StepStatus = "waiting" | "running" | "done" | "failed";

export type Report = {
  uploadId: string;
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt?: string;
  error?: string;
  steps: { trends: StepStatus; research: StepStatus; forecast: StepStatus; review: StepStatus };
  trends?: TrendReport;
  research?: MarketResearch;
  forecast?: Forecast;
  review?: ForecastReview; // the Trend Analyst's check of the forecast
};

// A run that hasn't finished after this long is treated as dead and can be restarted.
const STALE_AFTER_MS = 10 * 60 * 1000;

function reports() {
  return getStore({ name: "reports", consistency: "strong" });
}

export async function loadReport(uploadId: string): Promise<Report | null> {
  return reports().get(uploadId, { type: "json" });
}

function saveReport(report: Report) {
  return reports().setJSON(report.uploadId, report);
}

export function isInProgress(report: Report | null): boolean {
  return report?.status === "running" && Date.now() - Date.parse(report.startedAt) < STALE_AFTER_MS;
}

export async function queueReport(uploadId: string): Promise<Report> {
  const report: Report = {
    uploadId,
    status: "running",
    startedAt: new Date().toISOString(),
    steps: { trends: "waiting", research: "waiting", forecast: "waiting", review: "waiting" },
  };
  await saveReport(report);
  return report;
}

export async function runReport(uploadId: string): Promise<void> {
  const report = (await loadReport(uploadId)) ?? (await queueReport(uploadId));
  const [upload, sales, feedback, listings] = await Promise.all([
    loadUpload(uploadId),
    loadSales(uploadId),
    loadFeedback(uploadId),
    loadListings(uploadId),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  // Runs one agent, marking its step running, then done or failed.
  async function step<T>(name: keyof Report["steps"], run: () => Promise<T>): Promise<T> {
    report.steps[name] = "running";
    await saveReport(report);
    try {
      return await run();
    } catch (error) {
      report.steps[name] = "failed";
      throw error;
    }
  }

  try {
    if (!upload || !sales) throw new Error("Upload not found.");
    const { metrics } = upload;

    const sellThrough = listings ? calculateSellThrough(metrics, listings.counts) : null;
    report.trends = await step("trends", () => runTrendAnalyst(metrics, sales, sellThrough));
    report.steps.trends = "done";

    report.research = await step("research", () =>
      runMarketResearcher(metrics, report.trends!, today, feedback.humanResearch?.notes),
    );
    report.steps.research = "done";

    report.forecast = await step("forecast", () =>
      runForecaster(metrics, report.trends!, report.research!, today),
    );
    report.steps.forecast = "done";

    report.review = await step("review", () => reviewForecast(metrics, report.trends!, report.forecast!));
    report.steps.review = "done";

    report.status = "done";
  } catch (error) {
    console.error("Report failed", uploadId, error);
    report.status = "failed";
    report.error = error instanceof Error ? error.message : "Something went wrong.";
  }
  report.finishedAt = new Date().toISOString();
  await saveReport(report);
}
