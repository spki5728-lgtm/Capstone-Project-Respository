import { CalendarCheck, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { saveCheckIn, type Feedback, type ReportWithFeedback } from "../lib/api";
import { formatMoney } from "../lib/format";

const RATINGS = [
  { value: "spot-on", label: "Spot on" },
  { value: "close", label: "Close" },
  { value: "off", label: "Way off" },
] as const;

type Range = { low: number; expected: number; high: number };

// 30 days after the forecast, the seller enters what actually happened and says how accurate the AI was.
export default function CheckInCard({
  report,
  onSaved,
}: {
  report: ReportWithFeedback;
  onSaved: (feedback: Feedback) => void;
}) {
  const checkIn = report.feedback.checkIn;
  const dueDate = new Date(Date.parse(report.finishedAt ?? report.startedAt) + 30 * 24 * 60 * 60 * 1000);
  const isDue = Date.now() >= dueDate.getTime();
  const [editing, setEditing] = useState(false);
  const [revenue, setRevenue] = useState(checkIn ? String(checkIn.actualRevenue) : "");
  const [items, setItems] = useState(checkIn ? String(checkIn.actualItems) : "");
  const [rating, setRating] = useState<string>(checkIn?.rating ?? "");
  const [comment, setComment] = useState(checkIn?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await saveCheckIn(report.uploadId, { actualRevenue: Number(revenue), actualItems: Number(items), rating, comment }));
      setEditing(false);
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
          <CalendarCheck size={20} />
        </span>
        <div>
          <h3 className="text-lg font-bold leading-tight">30-day check-in</h3>
          <span className="text-xs text-stone-500">
            How accurate was the AI? {isDue ? "Due now" : `Due ${dueDate.toLocaleDateString()}`}
          </span>
        </div>
      </div>

      {checkIn && !editing ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Accuracy label="Revenue" actual={checkIn.actualRevenue} forecast={checkIn.forecast.revenue} format={formatMoney} />
            <Accuracy label="Items sold" actual={checkIn.actualItems} forecast={checkIn.forecast.itemsSold} format={String} />
          </div>
          <p className="mt-4 text-sm text-stone-700">
            <span className="font-semibold">Your verdict: {RATINGS.find((r) => r.value === checkIn.rating)?.label}.</span>{" "}
            {checkIn.comment}
          </p>
          <button type="button" onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-rose-600 hover:underline">
            Edit check-in
          </button>
        </>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <p className="text-sm text-stone-600">
            {isDue
              ? "It's been 30 days. Enter what you actually sold to see how close the forecast was."
              : "Come back after 30 days and enter what you actually sold. (You can enter it early to try it out.)"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Actual revenue ($)
              <input type="number" min="0" step="0.01" required value={revenue} onChange={(event) => setRevenue(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="block text-sm font-medium">
              Actual items sold
              <input type="number" min="0" step="1" required value={items} onChange={(event) => setItems(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">How accurate was the AI?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATINGS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRating(option.value)}
                  aria-pressed={rating === option.value}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    rating === option.value ? "border-rose-500 bg-rose-50 text-rose-700" : "border-stone-300 bg-white hover:border-stone-400"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            What did it get right or wrong? <span className="font-normal text-stone-500">(optional)</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !rating} className="btn-primary disabled:opacity-60">
            {busy && <LoaderCircle size={16} className="animate-spin" />} Save check-in
          </button>
        </form>
      )}
    </div>
  );
}

// How far the actual number landed from the forecast's expected value, and whether it fell inside the range.
function Accuracy({
  label,
  actual,
  forecast,
  format,
}: {
  label: string;
  actual: number;
  forecast: Range;
  format: (value: number) => string;
}) {
  const accuracy = Math.max(0, Math.round(100 - (Math.abs(actual - forecast.expected) / Math.max(forecast.expected, 1)) * 100));
  const inRange = actual >= forecast.low && actual <= forecast.high;
  return (
    <div className="rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 p-4">
      <div className="text-sm font-medium text-stone-600">{label}</div>
      <div className="text-flip mt-1 text-3xl font-extrabold tracking-tight">{accuracy}% accurate</div>
      <div className="mt-1 text-sm text-stone-600">
        Actual {format(actual)} vs forecast {format(Math.round(forecast.expected))}
      </div>
      <div className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${inRange ? "text-emerald-700" : "text-red-700"}`}>
        {inRange ? <CircleCheck size={16} /> : <CircleX size={16} />}
        {inRange ? "Inside" : "Outside"} the predicted range ({format(Math.round(forecast.low))} – {format(Math.round(forecast.high))})
      </div>
    </div>
  );
}
