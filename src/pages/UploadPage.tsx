import { useState } from "react";
import { useNavigate } from "react-router";
import demoCsv from "../../raw-data/demo.csv?raw";
import { uploadCsv } from "../lib/api";

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
      <h2 className="text-2xl font-semibold">Upload your sales</h2>
      <p className="mt-2 text-gray-600">
        Upload the sales CSV you downloaded from Depop to see your metrics and get an AI report.
      </p>

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
        className={`mt-6 block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
          dragging ? "border-rose-500 bg-rose-50" : "border-gray-300 bg-white hover:border-gray-400"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(event) => sendFile(event.target.files?.[0])}
        />
        <p className="font-medium text-gray-900">
          {busy ? "Crunching your sales…" : "Drop your CSV here, or click to choose a file"}
        </p>
        <p className="mt-1 text-sm text-gray-500">Depop sales export, up to 5 MB</p>
      </label>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
        <span>No export handy?</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => send(demoCsv, "demo.csv")}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60"
        >
          Try the demo data
        </button>
      </div>
    </section>
  );
}
