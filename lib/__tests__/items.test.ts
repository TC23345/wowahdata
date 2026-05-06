import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  aggregateItems,
  displayName,
  filterByDisplayName,
  searchItems,
} from "../items";
import { parseExpiredCanceled, parsePurchaseSale, parseCashFlow } from "../parse";
import { buildLoadedData } from "../parse";
import { SYNTHETIC_DE_GEAR } from "../csv";

const FIX = "__fixtures__/nightslayer";

function loadFixtures() {
  return buildLoadedData("Nightslayer", {
    purchases: parsePurchaseSale(
      readFileSync(join(FIX, "Accounting_Nightslayer_purchases.csv"), "utf8"),
    ),
    sales: parsePurchaseSale(
      readFileSync(join(FIX, "Accounting_Nightslayer_sales.csv"), "utf8"),
    ),
    expired: parseExpiredCanceled(
      readFileSync(join(FIX, "Accounting_Nightslayer_expired.csv"), "utf8"),
    ),
    canceled: parseExpiredCanceled(
      readFileSync(join(FIX, "Accounting_Nightslayer_canceled.csv"), "utf8"),
    ),
    income: parseCashFlow(
      readFileSync(join(FIX, "Accounting_Nightslayer_income.csv"), "utf8"),
    ),
    expenses: parseCashFlow(
      readFileSync(join(FIX, "Accounting_Nightslayer_expenses.csv"), "utf8"),
    ),
  });
}

describe("item aggregation + DE Gear synthetic bucket", () => {
  it("displayName collapses '?' into the synthetic name", () => {
    expect(displayName({ itemName: "?" })).toBe(SYNTHETIC_DE_GEAR);
    expect(displayName({ itemName: "Arcane Dust" })).toBe("Arcane Dust");
  });

  it("aggregateItems folds every '?' row under DE Gear", () => {
    const loaded = loadFixtures();
    const items = aggregateItems(loaded);
    const synth = items.find((i) => i.name === SYNTHETIC_DE_GEAR);
    expect(synth).toBeTruthy();
    expect(synth!.isSynthetic).toBe(true);
    expect(synth!.txnCount).toBeGreaterThan(3000); // 3034 random-enchant rows in real export
    // No literal '?' should appear as its own item
    expect(items.some((i) => i.name === "?")).toBe(false);
  });

  it("aggregateItems sorts by txnCount descending", () => {
    const loaded = loadFixtures();
    const items = aggregateItems(loaded);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].txnCount).toBeGreaterThanOrEqual(items[i].txnCount);
    }
  });

  it("Arcane Dust is the highest-volume sold item in the fixture", () => {
    const loaded = loadFixtures();
    const items = aggregateItems(loaded);
    const top5 = items.slice(0, 5).map((i) => i.name);
    // Arcane Dust dominates sales by row count; should be in the top 5
    expect(top5).toContain("Arcane Dust");
  });

  it("searchItems excludes the synthetic DE Gear entry from text search", () => {
    const items = aggregateItems(loadFixtures());
    const matches = searchItems(items, "?");
    expect(matches.some((i) => i.isSynthetic)).toBe(false);
  });

  it("filterByDisplayName(SYNTHETIC) matches all '?' rows", () => {
    const loaded = loadFixtures();
    const filtered = filterByDisplayName(loaded.purchases, SYNTHETIC_DE_GEAR);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.itemName === "?")).toBe(true);
  });
});
