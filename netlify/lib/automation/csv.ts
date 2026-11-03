// Turns a Depop sales export into clean, typed sale rows.
import { UserFacingError } from "../errors";

// Depop launched in 2011, so earlier dates (or future ones) are typos and are skipped. This also stops a file
// with dates decades apart from producing thousands of weekly rows.
const EARLIEST_SALE = "2011-01-01";
const MAX_ROWS = 20000;
const MAX_TEXT = 120; // longest description/brand/category kept, so free text can't bloat AI prompts

export type Sale = {
  date: string; // YYYY-MM-DD
  description: string;
  brand: string;
  category: string;
  size: string;
  price: number; // item price paid by the buyer, before fees
  fees: number; // Depop fee + payment processing + boosting
  refunded: boolean;
};

export type CleanResult = {
  sales: Sale[];
  skippedRows: number;
  duplicateRows: number;
};

// Header names vary between exports, so match on a squashed lowercase version.
const HEADER_ALIASES: Record<string, keyof Sale | "depopFee" | "paymentFee" | "boostingFee"> = {
  dateofsale: "date",
  date: "date",
  solddate: "date",
  description: "description",
  title: "description",
  itemdescription: "description",
  brand: "brand",
  category: "category",
  size: "size",
  itemprice: "price",
  price: "price",
  saleprice: "price",
  depopfee: "depopFee",
  paymentprocessingfee: "paymentFee",
  depoppaymentsfee: "paymentFee",
  paymentfee: "paymentFee",
  boostingfee: "boostingFee",
  refunded: "refunded",
  refundedtobuyeramount: "refunded",
};

export function cleanSalesCsv(text: string): CleanResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new UserFacingError("The CSV has no sales rows.");
  if (rows.length > MAX_ROWS + 1) throw new UserFacingError(`The CSV has more than ${MAX_ROWS} rows. Split it into smaller files.`);

  const columns = rows[0].map((header) => HEADER_ALIASES[squash(header)]);
  if (!columns.includes("date") || !columns.includes("price")) {
    throw new UserFacingError("Couldn't find a sale date and item price column. Is this a Depop sales export?");
  }

  const sales: Sale[] = [];
  const seen = new Set<string>();
  let skippedRows = 0;
  let duplicateRows = 0;

  for (const row of rows.slice(1)) {
    if (row.every((cell) => cell.trim() === "")) continue;

    const field = (name: string) => {
      const index = columns.indexOf(name as never);
      return index === -1 ? "" : cleanText(row[index] ?? "");
    };

    const date = parseDate(field("date"));
    const price = parseMoney(field("price"));
    if (!date || price === null) {
      skippedRows++;
      continue;
    }

    const sale: Sale = {
      date,
      description: field("description"),
      brand: field("brand") || "Unbranded",
      category: field("category") || "Uncategorized",
      size: field("size"),
      price,
      fees:
        (parseMoney(field("depopFee")) ?? 0) +
        (parseMoney(field("paymentFee")) ?? 0) +
        (parseMoney(field("boostingFee")) ?? 0),
      refunded: isRefunded(field("refunded")),
    };

    const key = `${sale.date}|${sale.description}|${sale.price}`;
    if (seen.has(key)) {
      duplicateRows++;
      continue;
    }
    seen.add(key);
    sales.push(sale);
  }

  if (sales.length === 0) throw new UserFacingError("No rows had a readable date and price.");
  sales.sort((a, b) => a.date.localeCompare(b.date));
  return { sales, skippedRows, duplicateRows };
}

// Minimal CSV parser: handles quoted fields, escaped quotes, and commas or newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// Strips control characters and line breaks, collapses spaces, and caps the length.
function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

function squash(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

// Accepts 2026-08-02, 08/02/2026, and 8/2/26.
function parseDate(value: string): string | null {
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIsoDate(+iso[1], +iso[2], +iso[3]);

  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const year = us[3].length === 2 ? 2000 + +us[3] : +us[3];
    return toIsoDate(year, +us[1], +us[2]);
  }
  return null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return iso >= EARLIEST_SALE && iso <= tomorrow ? iso : null;
}

function parseMoney(value: string): number | null {
  if (value === "") return null;
  const number = Number(value.replace(/[$£€,\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function isRefunded(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower === "yes" || lower === "true") return true;
  const amount = parseMoney(value);
  return amount !== null && amount > 0;
}
