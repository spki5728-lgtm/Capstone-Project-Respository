import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import WeeklyRevenueChart from "../components/WeeklyRevenueChart";
import { getUpload, latestUploadId, type Upload } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") ?? latestUploadId();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getUpload(id)
      .then(setUpload)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your sales."));
  }, [id]);

  if (!id) {
    return (
      <Empty>
        No sales yet. <Link to="/" className="font-medium text-rose-700 underline">Upload your CSV</Link> to
        see your dashboard.
      </Empty>
    );
  }
  if (error) return <Empty>{error}</Empty>;
  if (!upload) return <Empty>Loading your sales…</Empty>;

  const { metrics } = upload;
  const maxBrandRevenue = Math.max(...metrics.topBrands.map((brand) => brand.revenue), 1);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            {upload.fileName} · {formatDate(metrics.firstSale)} – {formatDate(metrics.lastSale)}
            {upload.duplicateRows + upload.skippedRows > 0 &&
              ` · ignored ${upload.duplicateRows} duplicate and ${upload.skippedRows} unreadable rows`}
          </p>
        </div>
        <Link
          to={`/report?id=${upload.id}`}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Get AI report →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue" value={formatMoney(metrics.revenue)} />
        <Stat label="Net after fees" value={formatMoney(metrics.netEarnings)} />
        <Stat label="Items sold" value={String(metrics.itemsSold)} />
        <Stat label="Average price" value={formatMoney(metrics.averagePrice)} />
      </div>
      {metrics.refunds > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {metrics.refunds} refunded {metrics.refunds === 1 ? "sale is" : "sales are"} left out of these numbers.
        </p>
      )}

      <Card title="Revenue by week">
        <WeeklyRevenueChart weeks={metrics.weekly} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Top brands by revenue">
          <ul className="space-y-3">
            {metrics.topBrands.map((brand) => (
              <li key={brand.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{brand.name}</span>
                  <span className="text-gray-600">
                    {formatMoney(brand.revenue)} · {brand.itemsSold} sold
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-rose-600"
                    style={{ width: `${(brand.revenue / maxBrandRevenue) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Categories">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="pb-2 font-normal">Category</th>
                <th className="pb-2 text-right font-normal">Sold</th>
                <th className="pb-2 text-right font-normal">Avg price</th>
                <th className="pb-2 text-right font-normal">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {metrics.categories.map((category) => (
                <tr key={category.name} className="border-t border-gray-100">
                  <td className="py-1.5">{category.name}</td>
                  <td className="py-1.5 text-right">{category.itemsSold}</td>
                  <td className="py-1.5 text-right">{formatMoney(category.averagePrice)}</td>
                  <td className="py-1.5 text-right">{formatMoney(category.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="mb-6 font-medium">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">{children}</p>
    </section>
  );
}
