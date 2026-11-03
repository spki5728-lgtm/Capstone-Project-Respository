import { ExternalLink, LoaderCircle, Pencil, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { depopShopUrl, saveDepopHandle } from "../lib/api";
import { useProfile } from "../lib/profile";

// Save your Depop username once, then jump to your shop page in one click.
export default function DepopShopCard() {
  const { profile, setProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!profile) return null;
  const saved = profile.depopHandle;
  const showForm = editing || !saved;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setProfile(await saveDepopHandle(handle));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-md shadow-rose-500/20">
        <Store size={20} />
      </span>

      {showForm ? (
        <form onSubmit={save} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Your Depop shop</div>
            <div className="mt-1 flex items-center rounded-xl border border-stone-300 bg-white px-3 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100">
              <span className="text-sm text-stone-400">depop.com/</span>
              <input
                autoFocus={editing}
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="your-username"
                aria-label="Depop username"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
              />
            </div>
          </div>
          <button type="submit" disabled={busy || !handle.trim()} className="btn-primary self-end disabled:opacity-60">
            {busy && <LoaderCircle size={16} className="animate-spin" />} Save
          </button>
          {error && <p className="w-full text-sm text-red-700">{error}</p>}
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-stone-500">Your Depop shop</div>
            <div className="truncate font-bold">@{saved}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setHandle(saved);
              setEditing(true);
            }}
            className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            aria-label="Change Depop username"
          >
            <Pencil size={16} />
          </button>
          <a href={depopShopUrl(saved)} target="_blank" rel="noreferrer" className="btn-primary">
            View my Depop page <ExternalLink size={16} />
          </a>
        </>
      )}
    </div>
  );
}
