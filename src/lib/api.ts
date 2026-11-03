// Browser-side calls to our Netlify Functions.
import type { Report } from "../../netlify/lib/automation/report";
import type { Upload } from "../../netlify/lib/automation/storage";

export type { Report, Upload };

const LATEST_UPLOAD_KEY = "latestUploadId";

export async function uploadCsv(csv: string, fileName: string): Promise<Upload> {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "text/csv", "x-file-name": fileName },
    body: csv,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Upload failed.");
  rememberUpload(body.id);
  return body;
}

export async function getUpload(id: string): Promise<Upload> {
  const response = await fetch(`/api/uploads/${id}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Couldn't load that upload.");
  return body;
}

// Returns null when no report has been started for this upload yet.
export async function getReport(uploadId: string): Promise<Report | null> {
  const response = await fetch(`/api/reports/${uploadId}`);
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Couldn't load the report.");
  return body;
}

export async function startReport(uploadId: string): Promise<Report> {
  const response = await fetch(`/api/reports/${uploadId}`, { method: "POST" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Couldn't start the report.");
  return body;
}

export function latestUploadId(): string | null {
  try {
    return localStorage.getItem(LATEST_UPLOAD_KEY);
  } catch {
    return null;
  }
}

function rememberUpload(id: string) {
  try {
    localStorage.setItem(LATEST_UPLOAD_KEY, id);
  } catch {
    // Private browsing can block storage; the id is still in the URL.
  }
}
