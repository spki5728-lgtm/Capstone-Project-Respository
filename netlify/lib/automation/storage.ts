// Saves and loads uploads (uploads/<id>/...), the seller's listing counts, and user profiles (profiles/<userId>) in Netlify Blobs.
// The raw CSV is never stored: only the cleaned sales and metrics are kept, and the seller can delete those.
import { getStore } from "@netlify/blobs";
import type { Sale } from "./csv";
import type { Metrics } from "./metrics";

export type Upload = {
  id: string;
  owner: string; // Netlify Identity user id
  uploadedAt: string;
  fileName: string;
  skippedRows: number;
  duplicateRows: number;
  metrics: Metrics;
};

export type UploadSummary = Pick<Upload, "id" | "fileName" | "uploadedAt"> & {
  itemsSold: number;
  revenue: number;
  firstSale: string;
  lastSale: string;
};

// How many items the seller listed per category over the same period as the upload, typed in by the seller.
export type Listings = { counts: Record<string, number>; savedAt: string };

export type Profile = {
  depopHandle?: string;
  latestUploadId?: string;
  uploadIds?: string[]; // newest first
};

const MAX_UPLOADS_LISTED = 50;

function uploads() {
  return getStore({ name: "uploads", consistency: "strong" });
}

function profiles() {
  return getStore({ name: "profiles", consistency: "strong" });
}

export async function saveUpload(upload: Upload, sales: Sale[]) {
  const store = uploads();
  await Promise.all([
    store.setJSON(`${upload.id}/sales.json`, sales),
    store.setJSON(`${upload.id}/upload.json`, upload),
  ]);
  const profile = await loadProfile(upload.owner);
  const ids = [upload.id, ...(profile.uploadIds ?? []).filter((id) => id !== upload.id)];
  await updateProfile(upload.owner, { latestUploadId: upload.id, uploadIds: ids });
}

export async function loadUpload(id: string): Promise<Upload | null> {
  return uploads().get(`${id}/upload.json`, { type: "json" });
}

// Only the user who uploaded it can see it.
export async function loadOwnedUpload(id: string, userId: string): Promise<Upload | null> {
  const upload = await loadUpload(id);
  return upload?.owner === userId ? upload : null;
}

export async function loadSales(id: string): Promise<Sale[] | null> {
  return uploads().get(`${id}/sales.json`, { type: "json" });
}

export async function listUploads(userId: string): Promise<UploadSummary[]> {
  const profile = await loadProfile(userId);
  // Uploads made before the list existed are only known as the latest upload.
  const ids = profile.uploadIds ?? (profile.latestUploadId ? [profile.latestUploadId] : []);
  const loaded = await Promise.all(ids.slice(0, MAX_UPLOADS_LISTED).map((id) => loadOwnedUpload(id, userId)));
  return loaded
    .filter((upload): upload is Upload => upload !== null)
    .map(({ id, fileName, uploadedAt, metrics }) => ({
      id,
      fileName,
      uploadedAt,
      itemsSold: metrics.itemsSold,
      revenue: metrics.revenue,
      firstSale: metrics.firstSale,
      lastSale: metrics.lastSale,
    }));
}

// Deletes an upload's files and removes it from the owner's list. Reports and feedback are removed by deletion.ts.
export async function deleteUploadFiles(upload: Upload) {
  const store = uploads();
  await Promise.all(
    ["raw.csv", "sales.json", "upload.json", "listings.json"].map((file) => store.delete(`${upload.id}/${file}`)),
  );
  const profile = await loadProfile(upload.owner);
  const ids = (profile.uploadIds ?? []).filter((id) => id !== upload.id);
  await profiles().setJSON(upload.owner, {
    ...profile,
    uploadIds: ids,
    latestUploadId: profile.latestUploadId === upload.id ? ids[0] : profile.latestUploadId,
  });
}

export async function loadListings(id: string): Promise<Listings | null> {
  return uploads().get(`${id}/listings.json`, { type: "json" });
}

export async function saveListings(id: string, counts: Record<string, number>): Promise<Listings> {
  const listings = { counts, savedAt: new Date().toISOString() };
  await uploads().setJSON(`${id}/listings.json`, listings);
  return listings;
}

export async function loadProfile(userId: string): Promise<Profile> {
  return (await profiles().get(userId, { type: "json" })) ?? {};
}

export async function updateProfile(userId: string, changes: Profile): Promise<Profile> {
  const profile = { ...(await loadProfile(userId)), ...changes };
  await profiles().setJSON(userId, profile);
  return profile;
}
