import { Gauge, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { calculateSellThrough } from "../../netlify/lib/automation/metrics";
import { saveListings, type Listings, type UploadWithListings } from "../lib/api";

// Listings-to-sales ratio: the seller types how many items they listed per category,
// and sees what share of them sold. Saved counts also go to the Trend Analyst.
export default function SellThroughCard({
  upload,
  onSaved,
}: {
  upload: UploadWithListings;
  onSaved: (listings: Listings) => void;
}) {
  const { categories } = upload.metrics;
  const [listed, setListed] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((category) => [category.name, String(upload.listings?.counts[category.name] ?? "")])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Live preview from what's typed so far; only valid counts are used.
  const typed = Object.fromEntries(
    Object.entries(listed)
      .map(([name, value]) => [name, Number(value)] as const)
      .filter(([, count]) => Number.isInteger(count) && count > 0),
  );
  const preview = calculateSellThrough(upload.metrics, typed);
  const rateByCategory = new Map(preview?.categories.map((category) => [category.name, category]) ?? []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await saveListings(upload.id, listed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rise card mt-6 p-5 [animation-delay:200ms]">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-md shadow-rose-500/20">
            <Gauge size={20} />
          </span>
          <div>
            <h3 className="font-bold">Listings to sales</h3>
            <p className="text-sm text-stone-500">How many did you list in each category over the same dates?</p>
          </div>
        </div>
        {preview && (
          <div className="text-right">
            <div className="text-flip text-3xl font-extrabold tracking-tight">{Math.round(preview.overall.rate)}%</div>
            <div className="text-xs text-stone-500">
              sell-through · {preview.overall.sold} of {preview.overall.listed} listed
            </div>
          </div>
        )}
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-stone-500">
          <tr>
            <th className="pb-2 font-normal">Category</th>
            <th className="pb-2 text-right font-normal">Sold</th>
            <th className="pb-2 pl-3 text-right font-normal">Listed</th>
            <th className="w-2/5 pb-2 pl-4 font-normal">Sell-through</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const result = rateByCategory.get(category.name);
            return (
              <tr key={category.name} className="border-t border-stone-100">
                <td className="py-1.5">{category.name}</td>
                <td className="py-1.5 text-right">{category.itemsSold}</td>
                <td className="py-1.5 pl-3 text-right">
                  <input
                    type="number"
                    min={category.itemsSold}
                    step="1"
                    inputMode="numeric"
                    value={listed[category.name]}
                    onChange={(event) => setListed({ ...listed, [category.name]: event.target.value })}
                    aria-label={`Items listed in ${category.name}`}
                    placeholder="–"
                    className="w-16 rounded-lg border border-stone-300 px-2 py-1 text-right outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </td>
                <td className="py-1.5 pl-4">
                  {result ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-stone-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-rose-600 to-orange-400"
                          style={{ width: `${Math.min(result.rate, 100)}%` }}
                        />
                      </div>
                      <span className="w-11 text-right font-semibold">{Math.round(result.rate)}%</span>
                    </div>
                  ) : (
                    <span className="text-stone-400">Enter listed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          {busy && <LoaderCircle size={16} className="animate-spin" />} Save listing counts
        </button>
        <span className="text-sm text-stone-500">
          {upload.listings && Object.keys(upload.listings.counts).length > 0
            ? "Saved. The Trend Analyst uses these next time you generate the report."
            : "Saved counts are given to the Trend Analyst in your AI report."}
        </span>
        {error && <span className="w-full text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
