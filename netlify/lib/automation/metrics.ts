// Calculates dashboard metrics from clean sales. Plain arithmetic, no AI.
import type { Sale } from "./csv";

export type Metrics = {
  itemsSold: number;
  revenue: number;
  fees: number;
  netEarnings: number;
  averagePrice: number;
  refunds: number;
  firstSale: string;
  lastSale: string;
  weekly: { weekStart: string; revenue: number; itemsSold: number }[];
  topBrands: { name: string; revenue: number; itemsSold: number }[];
  categories: { name: string; revenue: number; itemsSold: number; averagePrice: number }[];
};

export function calculateMetrics(allSales: Sale[]): Metrics {
  const sales = allSales.filter((sale) => !sale.refunded);
  const revenue = sum(sales.map((sale) => sale.price));
  const fees = sum(sales.map((sale) => sale.fees));

  return {
    itemsSold: sales.length,
    revenue: round(revenue),
    fees: round(fees),
    netEarnings: round(revenue - fees),
    averagePrice: sales.length ? round(revenue / sales.length) : 0,
    refunds: allSales.length - sales.length,
    firstSale: allSales[0]?.date ?? "",
    lastSale: allSales[allSales.length - 1]?.date ?? "",
    weekly: weeklyTotals(sales),
    topBrands: groupBy(sales, (sale) => sale.brand)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(({ name, revenue, itemsSold }) => ({ name, revenue, itemsSold })),
    categories: groupBy(sales, (sale) => sale.category).sort((a, b) => b.revenue - a.revenue),
  };
}

const MAX_WEEKS = 104;

// One entry per Monday-starting week, including weeks with no sales, so gaps show on the chart.
function weeklyTotals(sales: Sale[]): Metrics["weekly"] {
  if (sales.length === 0) return [];
  const totals = new Map<string, { revenue: number; itemsSold: number }>();
  for (const sale of sales) {
    const week = mondayOf(sale.date);
    const total = totals.get(week) ?? { revenue: 0, itemsSold: 0 };
    total.revenue += sale.price;
    total.itemsSold += 1;
    totals.set(week, total);
  }

  const weeks: Metrics["weekly"] = [];
  const last = mondayOf(sales[sales.length - 1].date);
  // At most the last 104 weeks (2 years), so the chart and AI prompts stay a sensible size.
  const first = [mondayOf(sales[0].date), addDays(last, -7 * (MAX_WEEKS - 1))].sort().at(-1)!;
  for (let week = first; week <= last; week = addDays(week, 7)) {
    const total = totals.get(week) ?? { revenue: 0, itemsSold: 0 };
    weeks.push({ weekStart: week, revenue: round(total.revenue), itemsSold: total.itemsSold });
  }
  return weeks;
}

function groupBy(sales: Sale[], keyOf: (sale: Sale) => string): Metrics["categories"] {
  const groups = new Map<string, Sale[]>();
  for (const sale of sales) {
    const key = keyOf(sale);
    groups.set(key, [...(groups.get(key) ?? []), sale]);
  }
  return [...groups].map(([name, group]) => {
    const revenue = sum(group.map((sale) => sale.price));
    return {
      name,
      revenue: round(revenue),
      itemsSold: group.length,
      averagePrice: round(revenue / group.length),
    };
  });
}

function mondayOf(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(isoDate, -daysSinceMonday);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export type SellThrough = {
  overall: { listed: number; sold: number; rate: number };
  categories: { name: string; listed: number; sold: number; rate: number }[];
};

// Listings-to-sales ratio: of the items the seller listed in each category, what share sold.
// `listed` counts every item listed in the period, sold or not. Categories with no count are left out.
export function calculateSellThrough(metrics: Metrics, listed: Record<string, number>): SellThrough | null {
  const categories = metrics.categories
    .filter((category) => (listed[category.name] ?? 0) > 0)
    .map((category) => {
      const count = listed[category.name];
      return { name: category.name, listed: count, sold: category.itemsSold, rate: round((category.itemsSold / count) * 100) };
    })
    .sort((a, b) => b.rate - a.rate);
  if (categories.length === 0) return null;

  const totalListed = sum(categories.map((category) => category.listed));
  const totalSold = sum(categories.map((category) => category.sold));
  return {
    overall: { listed: totalListed, sold: totalSold, rate: round((totalSold / totalListed) * 100) },
    categories,
  };
}
