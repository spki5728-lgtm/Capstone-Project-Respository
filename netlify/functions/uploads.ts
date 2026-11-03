// GET /api/uploads — the user's uploads, newest first, for picking one to view or delete.
import { requireUser } from "../lib/auth";
import { listUploads } from "../lib/automation/storage";

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (req.method !== "GET") return Response.json({ error: "Use GET." }, { status: 405 });
  return Response.json(await listUploads(user.id));
};

export const config = { path: "/api/uploads" };
