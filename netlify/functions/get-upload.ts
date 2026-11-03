// GET /api/uploads/<id> — returns a saved upload and its metrics.
import { loadUpload } from "../lib/automation/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async (req: Request) => {
  const id = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID.test(id)) return Response.json({ error: "Invalid upload id." }, { status: 400 });

  const upload = await loadUpload(id);
  if (!upload) return Response.json({ error: "Upload not found." }, { status: 404 });
  return Response.json(upload);
};

export const config = { path: "/api/uploads/:id" };
