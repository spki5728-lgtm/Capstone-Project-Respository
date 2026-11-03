// POST /api/upload — body is the CSV text. Cleans it, calculates metrics, and saves them for this user.
// The raw CSV itself is not kept.
import { requireUser } from "../lib/auth";
import { cleanSalesCsv } from "../lib/automation/csv";
import { calculateMetrics } from "../lib/automation/metrics";
import { saveUpload, type Upload } from "../lib/automation/storage";
import { useUpload } from "../lib/automation/usage";
import { publicMessage } from "../lib/errors";

const MAX_BYTES = 5 * 1024 * 1024;

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (req.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });

  const csv = await req.text();
  if (csv.length === 0) return Response.json({ error: "The file is empty." }, { status: 400 });
  if (csv.length > MAX_BYTES) return Response.json({ error: "The file is over 5 MB." }, { status: 413 });

  const allowed = await useUpload(user.id);
  if (!allowed.ok) return Response.json({ error: allowed.message, code: allowed.code }, { status: 429 });

  try {
    const { sales, skippedRows, duplicateRows } = cleanSalesCsv(csv);
    const upload: Upload = {
      id: crypto.randomUUID(),
      owner: user.id,
      uploadedAt: new Date().toISOString(),
      fileName: (req.headers.get("x-file-name") ?? "sales.csv").slice(0, 120),
      skippedRows,
      duplicateRows,
      metrics: calculateMetrics(sales),
    };
    await saveUpload(upload, sales);
    return Response.json(upload);
  } catch (error) {
    return Response.json({ error: publicMessage(error, "Couldn't read that CSV. Try again.") }, { status: 400 });
  }
};

export const config = { path: "/api/upload" };
