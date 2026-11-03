// GET   /api/reports/<uploadId> — current report, progress, and the seller's feedback.
// POST  /api/reports/<uploadId> — start (or restart) the AI report in the background.
// PATCH /api/reports/<uploadId> — save the seller's own research ({ humanResearch }) or 30-day check-in ({ checkIn }).
import { requireUser, UUID } from "../lib/auth";
import { loadFeedback, updateFeedback, type Feedback } from "../lib/automation/feedback";
import { isInProgress, loadReport, queueReport } from "../lib/automation/report";
import { loadOwnedUpload } from "../lib/automation/storage";

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const uploadId = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID.test(uploadId)) return Response.json({ error: "Invalid upload id." }, { status: 400 });
  if (!(await loadOwnedUpload(uploadId, user.id))) {
    return Response.json({ error: "Upload not found." }, { status: 404 });
  }

  const existing = await loadReport(uploadId);

  if (req.method === "GET") {
    if (!existing) return Response.json({ error: "No report yet." }, { status: 404 });
    return Response.json({ ...existing, feedback: await loadFeedback(uploadId) });
  }

  if (req.method === "PATCH") return saveFeedback(req, uploadId, existing);

  if (req.method !== "POST") return Response.json({ error: "Use GET, POST or PATCH." }, { status: 405 });
  if (isInProgress(existing)) return Response.json(existing);

  const report = await queueReport(uploadId);
  const started = await fetch(new URL("/.netlify/functions/run-report-background", req.url), {
    method: "POST",
    body: JSON.stringify({ uploadId }),
  });
  if (!started.ok) {
    return Response.json({ error: "Couldn't start the AI report. Try again." }, { status: 502 });
  }
  return Response.json(report, { status: 202 });
};

async function saveFeedback(req: Request, uploadId: string, report: Awaited<ReturnType<typeof loadReport>>) {
  const body = await req.json();
  const savedAt = new Date().toISOString();
  const changes: Feedback = {};

  if (typeof body.humanResearch === "string") {
    changes.humanResearch = { notes: body.humanResearch.slice(0, 5000), savedAt };
  }

  if (body.checkIn) {
    if (!report?.forecast) return Response.json({ error: "There's no forecast to check yet." }, { status: 400 });
    const actualRevenue = Number(body.checkIn.actualRevenue);
    const actualItems = Number(body.checkIn.actualItems);
    const rating = body.checkIn.rating;
    if (!(actualRevenue >= 0) || !(actualItems >= 0) || !["spot-on", "close", "off"].includes(rating)) {
      return Response.json({ error: "Enter your actual revenue, items sold and a rating." }, { status: 400 });
    }
    changes.checkIn = {
      actualRevenue,
      actualItems,
      rating,
      comment: String(body.checkIn.comment ?? "").slice(0, 2000),
      savedAt,
      forecast: { revenue: report.forecast.revenue, itemsSold: report.forecast.itemsSold },
    };
  }

  return Response.json(await updateFeedback(uploadId, changes));
}

export const config = { path: "/api/reports/:id" };
