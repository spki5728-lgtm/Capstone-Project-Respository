import { ArrowRight, CircleDollarSign, Package, Tag, Wallet, type LucideIcon } from "lucide-react";
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
          <h2 className="text-3xl font-extrabold tracking-tight">Your sales</h2>
          <p className="mt-1 text-sm text-stone-500">
            {upload.fileName} · {formatDate(metrics.firstSale)} – {formatDate(metrics.lastSale)}
            {upload.duplicateRows + upload.skippedRows > 0 &&
              ` · ignored ${upload.duplicateRows} duplicate and ${upload.skippedRows} unreadable rows`}
          </p>
        </div>
        <Link to={`/report?id=${upload.id}`} className="btn-primary">
          Get AI report <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={CircleDollarSign} label="Revenue" value={formatMoney(metrics.revenue)} index={0} />
        <Stat icon={Wallet} label="Net after fees" value={formatMoney(metrics.netEarnings)} index={1} />
        <Stat icon={Package} label="Items sold" value={String(metrics.itemsSold)} index={2} />
        <Stat icon={Tag} label="Average price" value={formatMoney(metrics.averagePrice)} index={3} />
      </div>
      {metrics.refunds > 0 && (
        <p className="mt-2 text-xs text-stone-500">
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
                  <span className="text-stone-600">
                    {formatMoney(brand.revenue)} · {brand.itemsSold} sold
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-rose-600 to-orange-400"
                    style={{ width: `${(brand.revenue / maxBrandRevenue) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Categories">
          <table className="w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="pb-2 font-normal">Category</th>
                <th className="pb-2 text-right font-normal">Sold</th>
                <th className="pb-2 text-right font-normal">Avg price</th>
                <th className="pb-2 text-right font-normal">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {metrics.categories.map((category) => (
                <tr key={category.name} className="border-t border-stone-100">
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

function Stat({ icon: Icon, label, value, index }: { icon: LucideIcon; label: string; value: string; index: number }) {
  return (
    <div className="rise card p-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <Icon size={16} />
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rise card mt-6 p-5 [animation-delay:200ms]">
      <h3 className="mb-6 font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-3xl font-extrabold tracking-tight">Your sales</h2>
      <p className="card mt-6 p-10 text-center text-stone-600">{children}</p>
    </section>
  );
}
