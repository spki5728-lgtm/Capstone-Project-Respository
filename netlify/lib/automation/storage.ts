// Saves and loads uploads (uploads/<id>/...), the seller's listing counts, and user profiles (profiles/<userId>) in Netlify Blobs.
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

// How many items the seller listed per category over the same period as the upload, typed in by the seller.
export type Listings = { counts: Record<string, number>; savedAt: string };

export type Profile = {
  depopHandle?: string;
  latestUploadId?: string;
};

function uploads() {
  return getStore({ name: "uploads", consistency: "strong" });
}

function profiles() {
  return getStore({ name: "profiles", consistency: "strong" });
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

// Only the user who uploaded it can see it.
export async function loadOwnedUpload(id: string, userId: string): Promise<Upload | null> {
  const upload = await loadUpload(id);
  return upload?.owner === userId ? upload : null;
}

export async function loadSales(id: string): Promise<Sale[] | null> {
  return uploads().get(`${id}/sales.json`, { type: "json" });
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
