// GET /api/uploads/<id> — returns one of the user's uploads and its metrics.
import { requireUser, UUID } from "../lib/auth";
import { loadOwnedUpload } from "../lib/automation/storage";

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const id = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID.test(id)) return Response.json({ error: "Invalid upload id." }, { status: 400 });

  const upload = await loadOwnedUpload(id, user.id);
  if (!upload) return Response.json({ error: "Upload not found." }, { status: 404 });
  return Response.json(upload);
};

export const config = { path: "/api/uploads/:id" };
