// GET   /api/uploads/<id> — one of the user's uploads, its metrics, and their listing counts.
// PATCH  /api/uploads/<id> — body { listed: { [category]: count } } saves how many items they listed per category.
// DELETE /api/uploads/<id> — deletes the upload and everything made from it (report, notes, check-in, listing counts).
import { requireUser, UUID } from "../lib/auth";
import { deleteUploadEverywhere } from "../lib/automation/deletion";
import { isInProgress, loadReport } from "../lib/automation/report";
import { loadListings, loadOwnedUpload, loadProfile, saveListings } from "../lib/automation/storage";

export default async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const id = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID.test(id)) return Response.json({ error: "Invalid upload id." }, { status: 400 });

  const upload = await loadOwnedUpload(id, user.id);
  if (!upload) return Response.json({ error: "Upload not found." }, { status: 404 });

  if (req.method === "GET") return Response.json({ ...upload, listings: await loadListings(id) });
  if (req.method === "DELETE") {
    if (isInProgress(await loadReport(id))) {
      return Response.json({ error: "Wait for the AI report to finish, then delete." }, { status: 409 });
    }
    await deleteUploadEverywhere(upload);
    return Response.json({ deleted: true, latestUploadId: (await loadProfile(user.id)).latestUploadId ?? null });
  }
  if (req.method !== "PATCH") return Response.json({ error: "Use GET, PATCH or DELETE." }, { status: 405 });

  const { listed } = await req.json().catch(() => ({}));
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
