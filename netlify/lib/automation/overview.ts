// The all-time view: every upload's sales merged into one set of metrics. Exports often overlap (e.g. two
// downloads covering the same month), so a sale that appears in more than one file is counted once.
import type { Sale } from "./csv";
import { calculateMetrics, type Metrics } from "./metrics";
import { knownUploadIds, listUploads, loadSales, type UploadSummary } from "./storage";

export type Overview = {
  uploads: UploadSummary[];
  overlappingSales: number; // sales found in more than one file and counted once
  metrics: Metrics;
};

export async function buildOverview(userId: string): Promise<Overview | null> {
  const uploads = await listUploads(userId);
  if (uploads.length === 0) return null;

  const ids = new Set(await knownUploadIds(userId));
  const salesPerFile = await Promise.all(uploads.filter((upload) => ids.has(upload.id)).map((upload) => loadSales(upload.id)));

  const seen = new Set<string>();
  const merged: Sale[] = [];
  let overlappingSales = 0;
  for (const sales of salesPerFile) {
    for (const sale of sales ?? []) {
      const key = `${sale.date}|${sale.description}|${sale.price}`;
      if (seen.has(key)) {
        overlappingSales++;
        continue;
      }
      seen.add(key);
      merged.push(sale);
    }
  }
  merged.sort((a, b) => a.date.localeCompare(b.date));
  return { uploads, overlappingSales, metrics: calculateMetrics(merged) };
}
