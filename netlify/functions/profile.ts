// GET /api/profile — the user's Depop handle, latest upload, and plan (free reports left or membership).
// PUT /api/profile — body { depopHandle } saves the handle ("" clears it).
import { requireUser } from "../lib/auth";
import { loadProfile, updateProfile } from "../lib/automation/storage";
import { loadPlan } from "../lib/automation/usage";

// Depop usernames: letters, numbers, dots, underscores and dashes.
const HANDLE = /^[a-z0-9._-]{1,30}$/;

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  if (req.method === "GET") {
    const [profile, plan] = await Promise.all([loadProfile(user.id), loadPlan(user.id)]);
    return Response.json({ ...profile, plan });
  }
  if (req.method !== "PUT") return Response.json({ error: "Use GET or PUT." }, { status: 405 });

  const { depopHandle } = await req.json().catch(() => ({}));
  const handle = String(depopHandle ?? "").trim().replace(/^@/, "").toLowerCase();
  if (handle && !HANDLE.test(handle)) {
    return Response.json({ error: "That doesn't look like a Depop username." }, { status: 400 });
  }
  const [profile, plan] = await Promise.all([updateProfile(user.id, { depopHandle: handle || undefined }), loadPlan(user.id)]);
  return Response.json({ ...profile, plan });
};

export const config = { path: "/api/profile" };
