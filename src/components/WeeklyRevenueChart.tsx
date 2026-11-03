import { useState } from "react";
import type { Upload } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

type Week = Upload["metrics"]["weekly"][number];

export default function WeeklyRevenueChart({ weeks }: { weeks: Week[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...weeks.map((week) => week.revenue), 1);
  const labelEvery = Math.ceil(weeks.length / 6);

  return (
    <div>
      <div className="relative flex h-48 items-end gap-0.5 border-b border-gray-200">
        <span className="absolute -top-5 left-0 text-xs text-gray-400">{formatMoney(max)}</span>
        {weeks.map((week, index) => (
          <div
            key={week.weekStart}
            className="relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className={`w-full rounded-t ${hovered === index ? "bg-rose-700" : "bg-rose-600"}`}
              style={{ height: `${(week.revenue / max) * 100}%`, minHeight: week.revenue > 0 ? 2 : 0 }}
            />
            {hovered === index && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow">
                <div className="font-medium">Week of {formatDate(week.weekStart)}</div>
                <div>
                  {formatMoney(week.revenue)} · {week.itemsSold} sold
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 text-xs text-gray-500">
        {weeks.map((week, index) => (
          <span key={week.weekStart} className="flex-1 truncate">
            {index % labelEvery === 0 ? formatDate(week.weekStart) : ""}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-gray-500">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-gray-500">
            <tr>
              <th className="py-1 font-normal">Week of</th>
              <th className="py-1 text-right font-normal">Revenue</th>
              <th className="py-1 text-right font-normal">Items sold</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart} className="border-t border-gray-100">
                <td className="py-1">{formatDate(week.weekStart)}</td>
                <td className="py-1 text-right">{formatMoney(week.revenue)}</td>
                <td className="py-1 text-right">{week.itemsSold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
