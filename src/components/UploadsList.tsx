import { FileSpreadsheet, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { deleteUpload, listUploads, type UploadSummary } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { useProfile } from "../lib/profile";

// Every CSV the seller has uploaded, with a link to its dashboard and a two-click delete.
// Deleting removes the sales, metrics, listing counts, AI report, notes and check-in for that file.
export default function UploadsList() {
  const { refreshProfile } = useProfile();
  const [uploads, setUploads] = useState<UploadSummary[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listUploads()
      .then((list) => {
        setUploads(list);
        // Arriving from the dashboard's "Switch or delete uploads" link: scroll down to the list.
        if (window.location.hash === "#uploads") {
          requestAnimationFrame(() => document.getElementById("uploads")?.scrollIntoView({ behavior: "smooth" }));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your uploads."));
  }, []);

  async function remove(id: string) {
    setDeleting(id);
    setError("");
    try {
      await deleteUpload(id);
      setUploads((current) => current?.filter((upload) => upload.id !== id) ?? null);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that upload.");
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  if (!uploads?.length && !error) return null;

  return (
    <section id="uploads" className="card mt-14 p-5">
      <h3 className="font-bold">Your uploads</h3>
      <p className="text-sm text-stone-500">
        Deleting an upload also deletes its AI report, notes, check-in and listing counts. The original CSV file isn't
        stored.
      </p>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="mt-3 divide-y divide-stone-100">
        {uploads?.map((upload) => (
          <li key={upload.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <FileSpreadsheet size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <Link to={`/dashboard?id=${upload.id}`} className="block truncate font-semibold hover:text-rose-600">
                {upload.fileName}
              </Link>
              <div className="text-xs text-stone-500">
                {formatDate(upload.firstSale)} – {formatDate(upload.lastSale)} · {upload.itemsSold} sold ·{" "}
                {formatMoney(upload.revenue)} · uploaded {new Date(upload.uploadedAt).toLocaleDateString()}
              </div>
            </div>
            {confirming === upload.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-600">Delete for good?</span>
                <button
                  type="button"
                  onClick={() => remove(upload.id)}
                  disabled={deleting === upload.id}
                  className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting === upload.id && <LoaderCircle size={14} className="animate-spin" />} Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(upload.id)}
                aria-label={`Delete ${upload.fileName}`}
                className="rounded-full p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
