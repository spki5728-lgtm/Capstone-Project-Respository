// Runs the agents in order and saves progress to Netlify Blobs after each one.
import { getStore } from "@netlify/blobs";
import { runForecaster, type Forecast } from "../agents/forecaster";
import { runMarketResearcher, type MarketResearch } from "../agents/marketResearcher";
import { reviewForecast, runTrendAnalyst, type ForecastReview, type TrendReport } from "../agents/trendAnalyst";
import { publicMessage } from "../errors";
import { loadFeedback } from "./feedback";
import { calculateSellThrough } from "./metrics";
import { loadListings, loadSales, loadUpload } from "./storage";
import { refundReport } from "./usage";

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
  runToken?: string; // one-time token the background function must present; never sent to the browser
};

// A run that hasn't finished after this long is treated as dead and can be restarted.
const STALE_AFTER_MS = 10 * 60 * 1000;

function reports() {
  return getStore({ name: "reports", consistency: "strong" });
}

export async function loadReport(uploadId: string): Promise<Report | null> {
  return reports().get(uploadId, { type: "json" });
}

export async function deleteReport(uploadId: string) {
  await reports().delete(uploadId);
}

export function withoutSecrets(report: Report): Report {
  const { runToken: _token, ...safe } = report;
  return safe;
}

function saveReport(report: Report) {
  return reports().setJSON(report.uploadId, report);
}

export function isInProgress(report: Report | null): boolean {
  return report?.status === "running" && Date.now() - Date.parse(report.startedAt) < STALE_AFTER_MS;
}

// Claims the right to run a report for this upload. Uses a conditional write, so if two requests race,
// only one gets `started: true`; the other gets the report that won.
export async function claimReportRun(uploadId: string): Promise<{ started: boolean; report: Report }> {
  const store = reports();
  const current = await store.getWithMetadata(uploadId, { type: "json" });
  const existing = (current?.data as Report | undefined) ?? null;
  if (existing && isInProgress(existing)) return { started: false, report: existing };

  const report: Report = {
    uploadId,
    status: "running",
    startedAt: new Date().toISOString(),
    steps: { trends: "waiting", research: "waiting", forecast: "waiting", review: "waiting" },
    runToken: crypto.randomUUID(),
  };
  const result = current?.etag
    ? await store.setJSON(uploadId, report, { onlyIfMatch: current.etag })
    : await store.setJSON(uploadId, report, { onlyIfNew: true });
  if (result.modified) return { started: true, report };
  return { started: false, report: (await loadReport(uploadId)) ?? report };
}

export async function failReport(uploadId: string, message: string) {
  const report = await loadReport(uploadId);
  if (!report) return;
  await saveReport({ ...withoutSecrets(report), status: "failed", error: message, finishedAt: new Date().toISOString() });
}

// Runs only when called with the token from claimReportRun, and only once per token.
export async function runReport(uploadId: string, token: string): Promise<void> {
  const store = reports();
  const current = await store.getWithMetadata(uploadId, { type: "json" });
  const claimed = current?.data as Report | undefined;
  if (!claimed || !current?.etag || claimed.status !== "running" || claimed.runToken !== token) return;

  // Use up the token so the same request can't start a second run.
  const report = withoutSecrets(claimed);
  if (!(await store.setJSON(uploadId, report, { onlyIfMatch: current.etag })).modified) return;

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
    report.status = "failed";
    report.error = publicMessage(error, "Something went wrong while generating your report. Try again.");
    // A failed run doesn't use up one of the seller's reports.
    if (upload) await refundReport(upload.owner);
  }
  report.finishedAt = new Date().toISOString();
  await saveReport(report);
}
