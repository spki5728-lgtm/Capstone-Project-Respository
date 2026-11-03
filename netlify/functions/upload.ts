// POST /api/upload — body is the CSV text. Cleans it, calculates metrics, and saves everything.
import { cleanSalesCsv } from "../lib/automation/csv";
import { calculateMetrics } from "../lib/automation/metrics";
import { saveUpload, type Upload } from "../lib/automation/storage";

const MAX_BYTES = 5 * 1024 * 1024;

export default async (req: Request) => {
  if (req.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });

  const csv = await req.text();
  if (csv.length === 0) return Response.json({ error: "The file is empty." }, { status: 400 });
  if (csv.length > MAX_BYTES) return Response.json({ error: "The file is over 5 MB." }, { status: 413 });

  try {
    const { sales, skippedRows, duplicateRows } = cleanSalesCsv(csv);
    const upload: Upload = {
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
      fileName: req.headers.get("x-file-name") ?? "sales.csv",
      skippedRows,
      duplicateRows,
      metrics: calculateMetrics(sales),
    };
    await saveUpload(upload, csv, sales);
    return Response.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't read that CSV.";
    return Response.json({ error: message }, { status: 400 });
  }
};

export const config = { path: "/api/upload" };
