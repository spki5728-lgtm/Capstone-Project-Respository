// GET /api/profile — the user's Depop handle and latest upload.
// PUT /api/profile — body { depopHandle } saves the handle ("" clears it).
import { requireUser } from "../lib/auth";
import { loadProfile, updateProfile } from "../lib/automation/storage";

// Depop usernames: letters, numbers, dots, underscores and dashes.
const HANDLE = /^[a-z0-9._-]{1,30}$/;

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  if (req.method === "GET") return Response.json(await loadProfile(user.id));
  if (req.method !== "PUT") return Response.json({ error: "Use GET or PUT." }, { status: 405 });

  const { depopHandle } = await req.json();
  const handle = String(depopHandle ?? "").trim().replace(/^@/, "").toLowerCase();
  if (handle && !HANDLE.test(handle)) {
    return Response.json({ error: "That doesn't look like a Depop username." }, { status: 400 });
  }
  return Response.json(await updateProfile(user.id, { depopHandle: handle || undefined }));
};

export const config = { path: "/api/profile" };
