// Turns a Depop sales export into clean, typed sale rows.

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
  if (rows.length < 2) throw new Error("The CSV has no sales rows.");

  const columns = rows[0].map((header) => HEADER_ALIASES[squash(header)]);
  if (!columns.includes("date") || !columns.includes("price")) {
    throw new Error("Couldn't find a sale date and item price column. Is this a Depop sales export?");
  }

  const sales: Sale[] = [];
  const seen = new Set<string>();
  let skippedRows = 0;
  let duplicateRows = 0;

  for (const row of rows.slice(1)) {
    if (row.every((cell) => cell.trim() === "")) continue;

    const field = (name: string) => {
      const index = columns.indexOf(name as never);
      return index === -1 ? "" : (row[index] ?? "").trim();
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

  if (sales.length === 0) throw new Error("No rows had a readable date and price.");
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
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
