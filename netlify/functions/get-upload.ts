// GET   /api/uploads/<id> — one of the user's uploads, its metrics, and their listing counts.
// PATCH /api/uploads/<id> — body { listed: { [category]: count } } saves how many items they listed per category.
import { requireUser, UUID } from "../lib/auth";
import { loadListings, loadOwnedUpload, saveListings } from "../lib/automation/storage";

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const id = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID.test(id)) return Response.json({ error: "Invalid upload id." }, { status: 400 });

  const upload = await loadOwnedUpload(id, user.id);
  if (!upload) return Response.json({ error: "Upload not found." }, { status: 404 });

  if (req.method === "GET") return Response.json({ ...upload, listings: await loadListings(id) });
  if (req.method !== "PATCH") return Response.json({ error: "Use GET or PATCH." }, { status: 405 });

  const { listed } = await req.json();
  const counts: Record<string, number> = {};
  for (const category of upload.metrics.categories) {
    const raw = listed?.[category.name];
    if (raw === undefined || raw === null || raw === "") continue;
    const count = Number(raw);
    if (!Number.isInteger(count) || count < 0) {
      return Response.json({ error: `Enter a whole number for ${category.name}.` }, { status: 400 });
    }
    if (count > 0 && count < category.itemsSold) {
      return Response.json(
        { error: `${category.name}: you sold ${category.itemsSold}, so you listed at least that many.` },
        { status: 400 },
      );
    }
    if (count > 0) counts[category.name] = count;
  }
  return Response.json(await saveListings(id, counts));
};

export const config = { path: "/api/uploads/:id" };
