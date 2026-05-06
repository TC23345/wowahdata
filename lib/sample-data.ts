import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePurchaseSale, parseExpiredCanceled, parseCashFlow, buildLoadedData } from "./parse";
import type { LoadedData } from "./csv";

// Sample data is read from __fixtures__/ at build time. Static generation
// inlines the parsed rows into the page; no runtime FS access needed.
const FIX = join(process.cwd(), "__fixtures__", "nightslayer");

function read(kind: string): string {
  return readFileSync(join(FIX, `Accounting_Nightslayer_${kind}.csv`), "utf8");
}

export function getSampleData(): LoadedData {
  return buildLoadedData("Nightslayer", {
    purchases: parsePurchaseSale(read("purchases")),
    sales: parsePurchaseSale(read("sales")),
    expired: parseExpiredCanceled(read("expired")),
    canceled: parseExpiredCanceled(read("canceled")),
    income: parseCashFlow(read("income")),
    expenses: parseCashFlow(read("expenses")),
  });
}
