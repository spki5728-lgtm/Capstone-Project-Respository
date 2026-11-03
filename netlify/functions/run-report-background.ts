// Background function (up to 15 minutes): runs the agents for one upload.
// Started by POST /api/reports/<id>. It only runs with the one-time token that request stored on the report,
// so calling this URL directly does nothing.
import { UUID } from "../lib/auth";
import { runReport } from "../lib/automation/report";

export default async (req: Request) => {
  if (req.method !== "POST") return;
  const body = await req.json().catch(() => null);
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
  const token = typeof body?.token === "string" ? body.token : "";
  if (!UUID.test(uploadId) || !UUID.test(token)) return;
  await runReport(uploadId, token);
};
