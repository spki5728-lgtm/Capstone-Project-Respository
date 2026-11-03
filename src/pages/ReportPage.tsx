import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getReport, latestUploadId, startReport, type Report } from "../lib/api";
import { formatMoney } from "../lib/format";

const STEPS: { key: keyof Report["steps"]; label: string; doing: string }[] = [
  { key: "trends", label: "Trend Analyst", doing: "Reading your sales history" },
  { key: "research", label: "Market Researcher", doing: "Searching the resale market" },
  { key: "forecast", label: "Forecaster", doing: "Projecting the next 30 days" },
];

export default function ReportPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") ?? latestUploadId();
  const [report, setReport] = useState<Report | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

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
      setReport(await startReport(id!));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the report.");
    }
  }

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

  return (
    <Shell
      action={
        report?.status !== "running" && (
          <button
            type="button"
            onClick={generate}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {report ? "Regenerate report" : "Generate AI report"}
          </button>
        )
      }
    >
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!report && (
        <Box>
          Three AI agents will study your sales, research the resale market, and forecast your next 30 days. It
          takes about a minute.
        </Box>
      )}

      {report && report.status !== "done" && <Progress report={report} />}

      {report?.trends && (
        <Section title="Trends" agent="Trend Analyst">
          <p className="text-lg font-medium">{report.trends.headline}</p>
          <ul className="mt-4 space-y-3">
            {report.trends.trends.map((trend) => (
              <li key={trend.title}>
                <span className="font-medium">{trend.title}.</span>{" "}
                <span className="text-gray-700">{trend.detail}</span>
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
        <Section title="30-day forecast" agent="Forecaster">
          <div className="grid grid-cols-2 gap-3">
            <Range
              label="Revenue"
              range={report.forecast.revenue}
              format={(value) => formatMoney(Math.round(value))}
            />
            <Range label="Items sold" range={report.forecast.itemsSold} format={(value) => String(Math.round(value))} />
          </div>
          <p className="mt-4 text-gray-700">{report.forecast.summary}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <List title="What's driving it" items={report.forecast.drivers} />
            <List title="Risks" items={report.forecast.risks} />
          </div>
        </Section>
      )}

      {report?.research && (
        <Section title="Sourcing & pricing" agent="Market Researcher">
          <p className="text-gray-700">{report.research.marketSummary}</p>
          <h4 className="mt-5 text-sm font-medium text-gray-500">Source next</h4>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="pb-2 font-normal">Item</th>
                <th className="pb-2 text-right font-normal">Buy under</th>
                <th className="pb-2 text-right font-normal">Sell for</th>
              </tr>
            </thead>
            <tbody>
              {report.research.sourcing.map((item) => (
                <tr key={item.item} className="border-t border-gray-100 align-top">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{item.item}</div>
                    <div className="text-gray-600">{item.why}</div>
                  </td>
                  <td className="py-2 text-right">{formatMoney(item.buyUnder)}</td>
                  <td className="py-2 text-right">{formatMoney(item.sellFor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="mt-5 text-sm font-medium text-gray-500">Pricing</h4>
          <ul className="mt-2 space-y-2 text-sm">
            {report.research.pricing.map((tip) => (
              <li key={tip.segment}>
                <span className="font-medium">{tip.segment}:</span> <span className="text-gray-700">{tip.advice}</span>
              </li>
            ))}
          </ul>
          {report.research.sources.length > 0 && (
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-gray-500">Sources ({report.research.sources.length})</summary>
              <ul className="mt-2 space-y-1">
                {report.research.sources.map((source) => (
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
    </Shell>
  );
}

function Progress({ report }: { report: Report }) {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
      {report.status === "failed" && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          The report stopped: {report.error} Try regenerating it.
        </p>
      )}
      <ol className="space-y-3">
        {STEPS.map((step) => {
          const status = report.steps[step.key];
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span className="w-5 text-center" aria-hidden>
                {status === "done" ? "✓" : status === "failed" ? "✕" : status === "running" ? <Spinner /> : "·"}
              </span>
              <span className={status === "waiting" ? "text-gray-400" : "text-gray-900"}>
                <span className="font-medium">{step.label}</span>
                {status === "running" && <span className="text-gray-500"> — {step.doing}…</span>}
                {status === "failed" && <span className="text-red-700"> — failed</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-rose-600" />
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
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{format(range.expected)}</div>
      <div className="text-sm text-gray-500">
        likely {format(range.low)} – {format(range.high)}
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, agent, children }: { title: string; agent: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs text-gray-400">by the {agent}</span>
      </div>
      {children}
    </div>
  );
}

function Shell({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">AI Report</h2>
          <p className="mt-1 text-gray-600">Trends, a 30-day forecast, and sourcing and pricing recommendations.</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">{children}</p>;
}
