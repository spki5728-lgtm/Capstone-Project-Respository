// Background function (up to 15 minutes): runs the three agents for one upload.
// Started by /api/reports/<id>; the browser polls that same URL for progress.
import { runReport } from "../lib/automation/report";

export default async (req: Request) => {
  const { uploadId } = await req.json();
  await runReport(uploadId);
};
