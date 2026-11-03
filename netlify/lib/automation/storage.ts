// Saves and loads each upload in Netlify Blobs, under uploads/<id>/...
import { getStore } from "@netlify/blobs";
import type { Sale } from "./csv";
import type { Metrics } from "./metrics";

export type Upload = {
  id: string;
  uploadedAt: string;
  fileName: string;
  skippedRows: number;
  duplicateRows: number;
  metrics: Metrics;
};

function uploads() {
  return getStore({ name: "uploads", consistency: "strong" });
}

export async function saveUpload(upload: Upload, rawCsv: string, sales: Sale[]) {
  const store = uploads();
  await Promise.all([
    store.set(`${upload.id}/raw.csv`, rawCsv),
    store.setJSON(`${upload.id}/sales.json`, sales),
    store.setJSON(`${upload.id}/upload.json`, upload),
  ]);
}

export async function loadUpload(id: string): Promise<Upload | null> {
  return uploads().get(`${id}/upload.json`, { type: "json" });
}

export async function loadSales(id: string): Promise<Sale[] | null> {
  return uploads().get(`${id}/sales.json`, { type: "json" });
}
