import { CloudUpload, LoaderCircle, Sparkles, Telescope, TrendingUp, ChartLine } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import demoCsv from "../../raw-data/demo.csv?raw";
import UploadsList from "../components/UploadsList";
import { uploadCsv } from "../lib/api";

const AGENTS = [
  { icon: TrendingUp, name: "Trend Analyst", blurb: "Finds what sells, when, and for how much." },
  { icon: Telescope, name: "Market Researcher", blurb: "Searches the resale market for what to source next." },
  { icon: ChartLine, name: "Forecaster", blurb: "Projects your next 30 days of sales." },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function send(csv: string, fileName: string) {
    setBusy(true);
    setError("");
    try {
      const upload = await uploadCsv(csv, fileName);
      navigate(`/dashboard?id=${upload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setBusy(false);
    }
  }

  async function sendFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    send(await file.text(), file.name);
  }

  return (
    <section>
      <div className="rise mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          <Sparkles size={14} /> AI insights for Depop sellers
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Know your next <span className="text-flip pr-1">best flip</span>
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Upload your Depop sales export. Flipcast shows what's selling, forecasts your next 30 days, and tells you
          what to source and how to price it.
        </p>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          sendFile(event.dataTransfer.files[0]);
        }}
        className={`rise card mx-auto mt-10 block max-w-2xl cursor-pointer border-2 border-dashed p-10 text-center transition [animation-delay:80ms] ${
          dragging ? "scale-[1.01] border-rose-400 bg-rose-50/60" : "border-rose-200 hover:border-rose-400"
        } ${busy ? "pointer-events-none" : ""}`}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(event) => sendFile(event.target.files?.[0])}
        />
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/25">
          {busy ? <LoaderCircle className="animate-spin" /> : <CloudUpload />}
        </span>
        <p className="mt-4 font-semibold text-stone-900">
          {busy ? "Crunching your sales…" : "Drop your CSV here, or click to choose a file"}
        </p>
        <p className="mt-1 text-sm text-stone-500">Depop sales export · up to 5 MB</p>
      </label>

      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-2xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rise mt-5 flex items-center justify-center gap-3 text-sm text-stone-600 [animation-delay:120ms]">
        <span>No export handy?</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => send(demoCsv, "demo.csv")}
          className="rounded-full border border-stone-300 bg-white px-4 py-1.5 font-semibold text-stone-900 shadow-sm transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
        >
          Try the demo data
        </button>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {AGENTS.map((agent, index) => (
          <div
            key={agent.name}
            className="rise card p-5"
            style={{ animationDelay: `${180 + index * 70}ms` }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <agent.icon size={20} />
            </span>
            <h3 className="mt-3 font-bold">{agent.name}</h3>
            <p className="mt-1 text-sm text-stone-600">{agent.blurb}</p>
          </div>
        ))}
      </div>

      <UploadsList />
    </section>
  );
}
