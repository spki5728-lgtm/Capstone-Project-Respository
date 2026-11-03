// GET  /api/reports/<uploadId> — current report and progress.
// POST /api/reports/<uploadId> — start (or restart) the AI report in the background.
import { isInProgress, loadReport, queueReport } from "../lib/automation/report";
import { loadUpload } from "../lib/automation/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async (req: Request) => {
  const uploadId = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID.test(uploadId)) return Response.json({ error: "Invalid upload id." }, { status: 400 });

  const existing = await loadReport(uploadId);

  if (req.method === "GET") {
    if (!existing) return Response.json({ error: "No report yet." }, { status: 404 });
    return Response.json(existing);
  }

  if (req.method !== "POST") return Response.json({ error: "Use GET or POST." }, { status: 405 });
  if (isInProgress(existing)) return Response.json(existing);
  if (!(await loadUpload(uploadId))) return Response.json({ error: "Upload not found." }, { status: 404 });

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

export const config = { path: "/api/reports/:id" };
