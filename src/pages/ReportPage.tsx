import {
  ChartLine,
  Check,
  LoaderCircle,
  RefreshCw,
  Scale,
  Sparkles,
  Telescope,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import CheckInCard from "../components/CheckInCard";
import HumanResearchCard from "../components/HumanResearchCard";
import UpgradeCard from "../components/UpgradeCard";
import UploadPicker from "../components/UploadPicker";
import {
  ApiError,
  getReport,
  listUploads,
  startReport,
  type Feedback,
  type Report,
  type ReportWithFeedback,
  type UploadSummary,
} from "../lib/api";
import { formatMoney } from "../lib/format";
import { useProfile } from "../lib/profile";

// `by` is the agent that writes each section; the discernment check is the Trend Analyst reviewing the Forecaster.
const STEPS: { key: keyof Report["steps"]; label: string; by: string; doing: string; icon: LucideIcon }[] = [
  { key: "trends", label: "Trend Analyst", by: "the Trend Analyst", doing: "Reading your sales history", icon: TrendingUp },
  { key: "research", label: "Market Researcher", by: "the Market Researcher", doing: "Searching the resale market", icon: Telescope },
  { key: "forecast", label: "Forecaster", by: "the Forecaster", doing: "Projecting the next 30 days", icon: ChartLine },
  {
    key: "review",
    label: "Discernment check",
    by: "the Trend Analyst, checking the Forecaster",
    doing: "Trend Analyst is checking the forecast",
    icon: Scale,
  },
];

const VERDICT_STYLE = {
  agrees: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "partly agrees": "bg-amber-50 text-amber-800 ring-amber-200",
  disagrees: "bg-red-50 text-red-700 ring-red-200",
};

export default function ReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, refreshProfile } = useProfile();
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [uploads, setUploads] = useState<UploadSummary[]>([]);
  const id = searchParams.get("id") ?? profile?.latestUploadId;
  const [report, setReport] = useState<ReportWithFeedback | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  // Every upload, for the picker that switches between each file's report.
  useEffect(() => {
    listUploads()
      .then(setUploads)
      .catch(() => setUploads([]));
  }, []);

  // Switching files clears the old file's report first.
  useEffect(() => {
    setReport(null);
    setLoaded(false);
    setNeedsUpgrade(false);
  }, [id]);

  const picker =
    id && uploads.length > 0 ? (
      <UploadPicker uploads={uploads} value={id} onChange={(next) => setSearchParams({ id: next })} />
    ) : null;

  // Load the report, and keep polling every 3 seconds while the agents are working.
  useEffect(() => {
    if (!id) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const latest = await getReport(id!);
        if (stopped) return;
        setReport(latest);
        setLoaded(true);
        if (latest?.status === "running") timer = setTimeout(poll, 3000);
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : "Couldn't load the report.");
      }
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, report?.startedAt]);

  async function generate() {
    setError("");
    try {
      const started = await startReport(id!);
      setReport({ ...started, feedback: report?.feedback ?? {} });
      refreshProfile();
    } catch (err) {
      if (err instanceof ApiError && err.code === "upgrade_required") setNeedsUpgrade(true);
      else setError(err instanceof Error ? err.message : "Couldn't start the report.");
    }
  }

  function updateFeedback(feedback: Feedback) {
    if (report) setReport({ ...report, feedback });
  }

  if (!profile && !id) return <Shell><Box>Loading…</Box></Shell>;
  if (!id) {
    return (
      <Shell>
        <Box>
          No sales yet. <Link to="/" className="font-medium text-rose-700 underline">Upload your CSV</Link> first.
        </Box>
      </Shell>
    );
  }
  if (!loaded && !error) return <Shell><Box>Loading…</Box></Shell>;

  const plan = profile?.plan;
  const outOfFreeReports = needsUpgrade || (plan !== undefined && !plan.member && plan.freeReportsLeft === 0);

  return (
    <Shell
      picker={picker}
      action={
        report?.status !== "running" &&
        !outOfFreeReports && (
          <div className="flex flex-col items-end gap-1">
            <button type="button" onClick={generate} className="btn-primary">
              {report ? <RefreshCw size={16} /> : <Sparkles size={16} />}
              {report ? "Regenerate report" : "Generate AI report"}
            </button>
            {plan && (
              <span className="text-xs text-stone-500">
                {plan.member
                  ? `Unlimited member · ${plan.reportsLeftToday} left today`
                  : `${plan.freeReportsLeft} of 2 free reports left`}
              </span>
            )}
          </div>
        )
      }
    >
      {outOfFreeReports && report?.status !== "running" && <UpgradeCard price={plan?.price ?? "$12.99/year"} />}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!report && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.key} className="rise card p-5" style={{ animationDelay: `${index * 70}ms` }}>
              <AgentBadge icon={step.icon} />
              <h3 className="mt-3 font-bold">{step.label}</h3>
              <p className="mt-1 text-sm text-stone-600">{step.doing}.</p>
            </div>
          ))}
          <p className="text-center text-sm text-stone-500 sm:col-span-2 lg:col-span-4">
            Click <span className="font-semibold text-stone-700">Generate AI report</span>. It takes about two minutes.
          </p>
        </div>
      )}

      {report && report.status !== "done" && <Progress report={report} />}

      {report?.trends && (
        <Section title="Trends" agent="trends">
          <p className="text-lg font-semibold leading-snug">{report.trends.headline}</p>
          <ul className="mt-4 space-y-3">
            {report.trends.trends.map((trend) => (
              <li key={trend.title}>
                <span className="font-semibold">{trend.title}.</span>{" "}
                <span className="text-stone-700">{trend.detail}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <List title="Selling well" items={report.trends.bestSellers} />
            {report.trends.slowMovers.length > 0 && <List title="Slow movers" items={report.trends.slowMovers} />}
          </div>
        </Section>
      )}

      {report?.forecast && (
        <Section title="30-day forecast" agent="forecast">
          <div className="grid grid-cols-2 gap-3">
            <Range
              label="Revenue"
              range={report.forecast.revenue}
              format={(value) => formatMoney(Math.round(value))}
            />
            <Range label="Items sold" range={report.forecast.itemsSold} format={(value) => String(Math.round(value))} />
          </div>
          <p className="mt-4 text-stone-700">{report.forecast.summary}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <List title="What's driving it" items={report.forecast.drivers} />
            <List title="Risks" items={report.forecast.risks} />
          </div>
        </Section>
      )}

      {report?.review && (
        <Section title="Discernment" agent="review">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-bold capitalize ring-1 ${VERDICT_STYLE[report.review.verdict]}`}>
              Trend Analyst {report.review.verdict}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
              {report.review.confidence} confidence in the forecast
            </span>
            {report.forecast && Math.round(report.review.suggestedRevenue) !== Math.round(report.forecast.revenue.expected) && (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
                Its own estimate: {formatMoney(Math.round(report.review.suggestedRevenue))}
              </span>
            )}
          </div>
          <p className="mt-4 text-stone-700">{report.review.summary}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <List title="Holds up" items={report.review.agreements} />
            {report.review.concerns.length > 0 && <List title="Concerns" items={report.review.concerns} />}
          </div>
        </Section>
      )}

      {report?.research && (
        <Section title="Sourcing & pricing" agent="research">
          <p className="text-stone-700">{report.research.marketSummary}</p>
          <h4 className="mt-5 text-sm font-medium text-stone-500">Source next</h4>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="pb-2 font-normal">Item</th>
                <th className="pb-2 text-right font-normal">Buy under</th>
                <th className="pb-2 text-right font-normal">Sell for</th>
              </tr>
            </thead>
            <tbody>
              {report.research.sourcing.map((item) => (
                <tr key={item.item} className="border-t border-stone-100 align-top">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{item.item}</div>
                    <div className="text-stone-600">{item.why}</div>
                  </td>
                  <td className="py-2 text-right">{formatMoney(item.buyUnder)}</td>
                  <td className="py-2 text-right">{formatMoney(item.sellFor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="mt-5 text-sm font-medium text-stone-500">Pricing</h4>
          <ul className="mt-2 space-y-2 text-sm">
            {report.research.pricing.map((tip) => (
              <li key={tip.segment}>
                <span className="font-medium">{tip.segment}:</span> <span className="text-stone-700">{tip.advice}</span>
              </li>
            ))}
          </ul>
          {report.research.sources.length > 0 && (
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-stone-500">Sources ({report.research.sources.length})</summary>
              <ul className="mt-2 space-y-1">
                {report.research.sources.filter((source) => source.url.startsWith("https://")).map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-rose-700 underline">
                      {source.title || source.url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Section>
      )}

      {report?.status === "done" && (
        <>
          <HumanResearchCard uploadId={id} feedback={report.feedback} onSaved={updateFeedback} />
          {report.forecast && <CheckInCard report={report} onSaved={updateFeedback} />}
        </>
      )}
    </Shell>
  );
}


function Progress({ report }: { report: Report }) {
  const done = STEPS.filter((step) => report.steps[step.key] === "done").length;
  return (
    <div className="card mt-6 p-5">
      {report.status === "failed" && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          The report stopped: {report.error} Try regenerating it.
        </p>
      )}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-600 to-orange-400 transition-all duration-700"
          style={{ width: `${Math.max((done / STEPS.length) * 100, 6)}%` }}
        />
      </div>
      <ol className="space-y-3">
        {STEPS.map((step) => {
          const status = report.steps[step.key];
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  status === "done"
                    ? "bg-emerald-50 text-emerald-600"
                    : status === "failed"
                      ? "bg-red-50 text-red-600"
                      : status === "running"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-stone-100 text-stone-400"
                }`}
                aria-hidden
              >
                {status === "done" ? (
                  <Check size={16} />
                ) : status === "failed" ? (
                  <X size={16} />
                ) : status === "running" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <step.icon size={16} />
                )}
              </span>
              <span className={status === "waiting" ? "text-stone-400" : "text-stone-900"}>
                <span className="font-semibold">{step.label}</span>
                {status === "running" && <span className="text-stone-500"> · {step.doing}…</span>}
                {status === "failed" && <span className="text-red-700"> · failed</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AgentBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-md shadow-rose-500/20">
      <Icon size={20} />
    </span>
  );
}

function Range({
  label,
  range,
  format,
}: {
  label: string;
  range: { low: number; expected: number; high: number };
  format: (value: number) => string;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 p-4">
      <div className="text-sm font-medium text-stone-600">{label}</div>
      <div className="text-flip mt-1 text-3xl font-extrabold tracking-tight">{format(range.expected)}</div>
      <div className="text-sm text-stone-500">
        likely {format(range.low)} – {format(range.high)}
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-stone-500">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700 marker:text-rose-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  agent,
  children,
}: {
  title: string;
  agent: keyof Report["steps"];
  children: React.ReactNode;
}) {
  const step = STEPS.find((candidate) => candidate.key === agent)!;
  return (
    <div className="rise card mt-6 p-6">
      <div className="mb-5 flex items-center gap-3">
        <AgentBadge icon={step.icon} />
        <div>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <span className="text-xs text-stone-500">by {step.by}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Shell({
  action,
  picker,
  children,
}: {
  action?: React.ReactNode;
  picker?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">AI Report</h2>
          <p className="mt-1 text-stone-600">Trends, a 30-day forecast, and sourcing and pricing recommendations.</p>
          {picker && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-500">
              Report for {picker}
            </div>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <p className="card mt-6 p-10 text-center text-stone-600">{children}</p>;
}
