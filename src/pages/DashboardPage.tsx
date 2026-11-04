import { ArrowRight, CircleDollarSign, Package, Tag, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import DepopShopCard from "../components/DepopShopCard";
import WeeklyRevenueChart from "../components/WeeklyRevenueChart";
import SellThroughCard from "../components/SellThroughCard";
import UploadPicker, { ALL_UPLOADS } from "../components/UploadPicker";
import { getOverview, getUpload, listUploads, type Overview, type UploadSummary, type UploadWithListings } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // No ?id means the all-time view across every upload.
  const view = searchParams.get("id") ?? ALL_UPLOADS;
  const [uploads, setUploads] = useState<UploadSummary[] | null>(null);
  const [upload, setUpload] = useState<UploadWithListings | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listUploads()
      .then(setUploads)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your uploads."));
  }, []);

  useEffect(() => {
    setError("");
    setUpload(null);
    setOverview(null);
    const load = view === ALL_UPLOADS ? getOverview().then(setOverview) : getUpload(view).then(setUpload);
    load.catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your sales."));
  }, [view]);

  function choose(next: string) {
    setSearchParams(next === ALL_UPLOADS ? {} : { id: next });
  }

  if (uploads && uploads.length === 0) {
    return (
      <Empty>
        No sales yet. <Link to="/" className="font-medium text-rose-700 underline">Upload your CSV</Link> to
        see your dashboard.
      </Empty>
    );
  }
  if (error) return <Empty>{error}</Empty>;
  const metrics = (view === ALL_UPLOADS ? overview : upload)?.metrics;
  if (!uploads || !metrics) return <Empty>Loading your sales…</Empty>;

  const maxBrandRevenue = Math.max(...metrics.topBrands.map((brand) => brand.revenue), 1);

  return (
    <section>
      <DepopShopCard />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">{upload ? "Your sales" : "All-time sales"}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {formatDate(metrics.firstSale)} – {formatDate(metrics.lastSale)}
            {overview &&
              ` · ${overview.uploads.length} ${overview.uploads.length === 1 ? "file" : "files"}` +
                (overview.overlappingSales > 0
                  ? ` · ${overview.overlappingSales} sales found in more than one file counted once`
                  : "")}
            {upload &&
              upload.duplicateRows + upload.skippedRows > 0 &&
              ` · ignored ${upload.duplicateRows} duplicate and ${upload.skippedRows} unreadable rows`}
            {" · "}
            <Link to="/#uploads" className="font-medium text-rose-600 hover:underline">
              Manage uploads
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UploadPicker uploads={uploads} value={view} onChange={choose} includeAll />
          <Link to={upload ? `/report?id=${upload.id}` : "/report"} className="btn-primary">
            {upload ? "Get AI report" : "AI reports"} <ArrowRight size={16} />
          </Link>
        </div>
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

      {upload ? (
        <SellThroughCard upload={upload} onSaved={(listings) => setUpload({ ...upload, listings })} />
      ) : (
        <p className="mt-3 text-sm text-stone-500">
          Pick a single file above to enter listing counts, see its sell-through, and get its AI report.
        </p>
      )}

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
      <DepopShopCard />
      <h2 className="mt-8 text-3xl font-extrabold tracking-tight">Your sales</h2>
      <p className="card mt-6 p-10 text-center text-stone-600">{children}</p>
    </section>
  );
}
