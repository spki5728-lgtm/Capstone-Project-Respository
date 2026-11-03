import { LoaderCircle, NotebookPen } from "lucide-react";
import { useState } from "react";
import { saveHumanResearch, type Feedback } from "../lib/api";

// The seller's own market research. It's saved with the report and given to the Market Researcher on regenerate.
export default function HumanResearchCard({
  uploadId,
  feedback,
  onSaved,
}: {
  uploadId: string;
  feedback: Feedback;
  onSaved: (feedback: Feedback) => void;
}) {
  const [notes, setNotes] = useState(feedback.humanResearch?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savedNotes = feedback.humanResearch?.notes ?? "";

  async function save() {
    setBusy(true);
    setError("");
    try {
      onSaved(await saveHumanResearch(uploadId, notes));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise card mt-6 p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
          <NotebookPen size={20} />
        </span>
        <div>
          <h3 className="text-lg font-bold leading-tight">Your market research</h3>
          <span className="text-xs text-stone-500">by you</span>
        </div>
      </div>
      <p className="text-sm text-stone-600">
        What are you seeing at thrift stores, in Depop searches, or from buyers? The Market Researcher weighs your notes
        next time you regenerate the report.
      </p>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={5}
        maxLength={5000}
        placeholder="e.g. Goodwill on Pearl St had 6 Carhartt jackets at $18 each. Baggy Levi's are getting lots of likes but sell slowly over $40…"
        className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || notes === savedNotes} className="btn-primary disabled:opacity-60">
          {busy && <LoaderCircle size={16} className="animate-spin" />} Save notes
        </button>
        {feedback.humanResearch && notes === savedNotes && (
          <span className="text-sm text-stone-500">
            Saved {new Date(feedback.humanResearch.savedAt).toLocaleString()}. Regenerate to include it.
          </span>
        )}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </div>
  );
}
