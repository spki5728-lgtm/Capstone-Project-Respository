// Browser-side calls to our Netlify Functions. The login cookie is sent automatically.
import type { Feedback } from "../../netlify/lib/automation/feedback";
import type { Report } from "../../netlify/lib/automation/report";
import type { Listings, Profile as StoredProfile, Upload, UploadSummary } from "../../netlify/lib/automation/storage";
import type { Plan } from "../../netlify/lib/automation/usage";

export type { Feedback, Listings, Plan, Report, Upload, UploadSummary };
export type Profile = StoredProfile & { plan: Plan };

// An API error, with the server's machine-readable code when there is one (e.g. "upgrade_required").
export class ApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}
export type UploadWithListings = Upload & { listings: Listings | null };
export type ReportWithFeedback = Report & { feedback: Feedback };

async function call<T>(path: string, init?: RequestInit, fallbackError = "Something went wrong."): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error ?? fallbackError, body.code);
  return body;
}

function sendJson(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export async function uploadCsv(csv: string, fileName: string): Promise<Upload> {
  return call<Upload>(
    "/api/upload",
    { method: "POST", headers: { "content-type": "text/csv", "x-file-name": fileName }, body: csv },
    "Upload failed.",
  );
}

export function getUpload(id: string): Promise<UploadWithListings> {
  return call(`/api/uploads/${id}`, undefined, "Couldn't load that upload.");
}

// `listed` maps category name to how many items were listed in the period ("" or 0 clears it).
export function saveListings(id: string, listed: Record<string, string>): Promise<Listings> {
  return call(`/api/uploads/${id}`, sendJson("PATCH", { listed }), "Couldn't save your listing counts.");
}

export function listUploads(): Promise<UploadSummary[]> {
  return call("/api/uploads", undefined, "Couldn't load your uploads.");
}

export function deleteUpload(id: string): Promise<{ deleted: true; latestUploadId: string | null }> {
  return call(`/api/uploads/${id}`, { method: "DELETE" }, "Couldn't delete that upload.");
}

// Returns null when no report has been started for this upload yet.
export async function getReport(uploadId: string): Promise<ReportWithFeedback | null> {
  const response = await fetch(`/api/reports/${uploadId}`);
  if (response.status === 404) {
    const body = await response.json();
    if (body.error === "No report yet.") return null;
    throw new Error(body.error);
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Couldn't load the report.");
  return body;
}

export function startReport(uploadId: string): Promise<Report> {
  return call(`/api/reports/${uploadId}`, { method: "POST" }, "Couldn't start the report.");
}

export function saveHumanResearch(uploadId: string, notes: string): Promise<Feedback> {
  return call(`/api/reports/${uploadId}`, sendJson("PATCH", { humanResearch: notes }), "Couldn't save your research.");
}

export function saveCheckIn(
  uploadId: string,
  checkIn: { actualRevenue: number; actualItems: number; rating: string; comment: string },
): Promise<Feedback> {
  return call(`/api/reports/${uploadId}`, sendJson("PATCH", { checkIn }), "Couldn't save your check-in.");
}

export function getProfile(): Promise<Profile> {
  return call("/api/profile", undefined, "Couldn't load your profile.");
}

export function saveDepopHandle(depopHandle: string): Promise<Profile> {
  return call("/api/profile", sendJson("PUT", { depopHandle }), "Couldn't save your Depop handle.");
}

export function depopShopUrl(handle: string): string {
  return `https://www.depop.com/${handle}/`;
}
