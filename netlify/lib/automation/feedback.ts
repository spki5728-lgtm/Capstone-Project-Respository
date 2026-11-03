// The seller's own input on a report: their market research, and a 30-day check-in with actual results.
// Kept apart from the AI report so a report run never overwrites it.
import { getStore } from "@netlify/blobs";
import type { Forecast } from "../agents/forecaster";

export type Feedback = {
  humanResearch?: { notes: string; savedAt: string };
  checkIn?: {
    actualRevenue: number;
    actualItems: number;
    rating: "spot-on" | "close" | "off";
    comment: string;
    savedAt: string;
    forecast: Pick<Forecast, "revenue" | "itemsSold">; // the forecast being judged, in case the report is regenerated
  };
};

function feedback() {
  return getStore({ name: "feedback", consistency: "strong" });
}

export async function loadFeedback(uploadId: string): Promise<Feedback> {
  return (await feedback().get(uploadId, { type: "json" })) ?? {};
}

export async function updateFeedback(uploadId: string, changes: Feedback): Promise<Feedback> {
  const updated = { ...(await loadFeedback(uploadId)), ...changes };
  await feedback().setJSON(uploadId, updated);
  return updated;
}

export async function deleteFeedback(uploadId: string) {
  await feedback().delete(uploadId);
}
