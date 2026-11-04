import { ChevronDown, Layers } from "lucide-react";
import type { UploadSummary } from "../lib/api";
import { formatDate } from "../lib/format";

export const ALL_UPLOADS = "all";

// Dropdown for choosing which upload to look at. The Dashboard also offers "All uploads" (all-time sales).
export default function UploadPicker({
  uploads,
  value,
  onChange,
  includeAll = false,
}: {
  uploads: UploadSummary[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Choose an upload</span>
      <Layers size={16} className="pointer-events-none absolute left-3 text-rose-600" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none rounded-full border border-stone-300 bg-white py-2 pl-9 pr-9 text-sm font-semibold shadow-sm outline-none transition hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      >
        {includeAll && (
          <option value={ALL_UPLOADS}>
            All uploads · all-time ({uploads.length} {uploads.length === 1 ? "file" : "files"})
          </option>
        )}
        {uploads.map((upload) => (
          <option key={upload.id} value={upload.id}>
            {upload.fileName} ({formatDate(upload.firstSale)} – {formatDate(upload.lastSale)})
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-stone-500" />
    </label>
  );
}
