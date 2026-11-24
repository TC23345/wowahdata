import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadFiles } from "../load";
import type { LoadedData } from "../csv";
import { binToHeatmap } from "../heatmap";
import { filterByDisplayName } from "../items";
import {
  allConversions,
  bestListingWindows,
  bucketAxis,
  bucketFor,
  buildLedger,
  classifyRole,
  computeRoles,
  feesSummary,
  itemsForShare,
  listingSuccess,
  ownCharacters,
  peakHours,
  weightedMedianPrice,
} from "../insights";

const FIX = "__fixtures__/nightslayer";
const KINDS = ["purchases", "sales", "expired", "canceled", "income", "expenses"];

function fixture(): LoadedData {
  const result = loadFiles(
    KINDS.map((k) => ({
      name: `Accounting_Nightslayer_${k}.csv`,
      text: readFileSync(join(FIX, `Accounting_Nightslayer_${k}.csv`), "utf8"),
    })),
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const data = fixture();
const roles = computeRoles(data);
const ledger = buildLedger(data, roles);

describe("roles", () => {
  it("classifies by units", () => {
    expect(classifyRole(4, 4769)).toBe("input");
    expect(classifyRole(27612, 5267)).toBe("output");
    expect(classifyRole(177, 225)).toBe("flip");
  });
  it("splits the sample into inputs, outputs and flips", () => {
    const counts = { input: 0, output: 0, flip: 0 };
    for (const r of roles.values()) counts[r] += 1;
    // Items seen only in expired/canceled rows have no role here; the ledger
    // treats them as flips (16 in the sample).
    expect(counts).toEqual({ input: 1052, output: 124, flip: 32 });
  });
});

describe("ledger", () => {
  it("ranks Greater Planar Essence first with auction revenue matching the golden value", () => {
    expect(ledger[0].name).toBe("Greater Planar Essence");
    expect(ledger[0].revenue).toBe(337_122_605);
    expect(ledger[0].soldUnits).toBe(5167);
  });
  it("finds four items carrying 80% of revenue", () => {
    expect(itemsForShare(ledger, 0.8)).toBe(4);
  });
  it("computes listing success by units including cancels", () => {
    const sold = ledger.reduce((s, r) => s + r.soldUnits, 0);
    const expired = ledger.reduce((s, r) => s + r.expiredUnits, 0);
    const canceled = ledger.reduce((s, r) => s + r.canceledUnits, 0);
    expect(listingSuccess(sold, expired, canceled)).toBeCloseTo(0.642, 3);
  });
});

describe("All conversions pipeline", () => {
  it("sums sold − bought over every member item, on both sides", () => {
    const p = allConversions(ledger);
    expect(p.memberCount).toBe(1176);
    expect(p.margin / 10_000).toBeCloseTo(-9691.03, 1);
    expect(p.inputs[0].name).toBe("DE Gear (random enchant)");
    expect(p.outputs[0].name).toBe("Greater Planar Essence");
  });
});

describe("timing", () => {
  const gpe = filterByDisplayName(data.sales, "Greater Planar Essence").filter((r) => r.source === "Auction");
  const units = binToHeatmap(gpe, "units", "utc").cells.flatMap((row) => row.map((c) => c.units));

  it("finds the evaluation's best six hours for Greater Planar Essence", () => {
    const peak = peakHours(units, 6);
    expect(peak.start).toBe(23);
    expect(peak.share).toBeCloseTo(0.56, 2);
  });
  it("ranks listing windows so a longer window never holds fewer units", () => {
    const [w2, w8, w24] = bestListingWindows(units, [2, 8, 24]);
    expect(w2.units).toBeLessThanOrEqual(w8.units);
    expect(w8.units).toBeLessThanOrEqual(w24.units);
    expect(w24.share).toBeLessThanOrEqual(1);
  });
});

describe("buckets", () => {
  it("derives the bucket from the range length", () => {
    const d = (s: string) => new Date(`${s}T00:00:00`);
    expect(bucketFor({ start: d("2026-04-01"), end: d("2026-04-30") })).toBe("day");
    expect(bucketFor({ start: d("2026-01-21"), end: d("2026-05-06") })).toBe("week");
    expect(bucketFor({ start: d("2024-01-01"), end: d("2026-01-01") })).toBe("month");
    expect(bucketFor({ start: d("2020-01-01"), end: d("2026-01-01") })).toBe("quarter");
  });
  it("starts weekly buckets on Tuesday", () => {
    const axis = bucketAxis({ start: new Date("2026-01-21T12:00:00"), end: new Date("2026-05-06T12:00:00") });
    expect(axis.starts.every((s) => s.getDay() === 2)).toBe(true);
    expect(axis.labels[0]).toBe("Wk of 20 Jan");
  });
});

describe("weightedMedianPrice", () => {
  it("weights by quantity", () => {
    expect(weightedMedianPrice([{ price: 1, quantity: 1 }, { price: 9, quantity: 5 }])).toBe(9);
    expect(weightedMedianPrice([])).toBeNull();
  });
});

describe("fees", () => {
  it("excludes money transfers from the total and separates own characters", () => {
    const f = feesSummary(data.income, data.expenses, ownCharacters(data));
    expect(f.total / 10_000).toBeCloseTo(39.97, 2);
    expect(f.transfersOwn.sent / 10_000).toBeCloseTo(725.31, 2);
    expect((f.transfersOwn.sent + f.transfersOther.sent) / 10_000).toBeCloseTo(4162.41, 2);
  });
});
