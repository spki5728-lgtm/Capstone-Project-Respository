// GET /api/overview — all-time metrics across every upload the user has.
import { requireUser } from "../lib/auth";
import { buildOverview } from "../lib/automation/overview";

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (req.method !== "GET") return Response.json({ error: "Use GET." }, { status: 405 });

  const overview = await buildOverview(user.id);
  if (!overview) return Response.json({ error: "No uploads yet." }, { status: 404 });
  return Response.json(overview);
};

export const config = { path: "/api/overview" };
