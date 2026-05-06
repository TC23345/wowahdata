import { describe, it, expect } from "vitest";
import { binToHeatmap } from "../heatmap";
import type { PurchaseSaleRow } from "../csv";

function row(
  partial: Partial<PurchaseSaleRow> & { time: number; quantity: number; price: number },
): PurchaseSaleRow {
  return {
    itemString: "i:22446",
    itemName: "Greater Planar Essence",
    stackSize: 1,
    otherPlayer: "Anon1",
    player: "Bluemage",
    source: "Auction",
    ...partial,
  };
}

describe("heatmap binning", () => {
  it("row order is Tue, Wed, Thu, Fri, Sat, Sun, Mon", () => {
    const m = binToHeatmap([], "units", "local");
    expect(m.rows).toEqual(["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"]);
  });

  it("emits 7 rows × 24 columns", () => {
    const m = binToHeatmap([], "units", "local");
    expect(m.cells.length).toBe(7);
    expect(m.cells.every((row) => row.length === 24)).toBe(true);
  });

  it("aggregates units into the correct (day, hour) cell", () => {
    // Tue 2026-04-07 14:00:00 local
    const t = Math.floor(new Date(2026, 3, 7, 14, 0, 0).getTime() / 1000);
    const rows = [row({ time: t, quantity: 5, price: 60000 })];
    const m = binToHeatmap(rows, "units", "local");
    // Tue is row 0, hour 14
    expect(m.cells[0][14].units).toBe(5);
    expect(m.cells[0][14].events).toBe(1);
    expect(m.cells[0][14].goldValue).toBeCloseTo(30, 4);
    // No other cell touched
    expect(m.totalUnits).toBe(5);
  });

  it("Monday rows land in the last row (index 6)", () => {
    // Mon 2026-04-06 09:00 local
    const t = Math.floor(new Date(2026, 3, 6, 9, 0, 0).getTime() / 1000);
    const rows = [row({ time: t, quantity: 1, price: 10000 })];
    const m = binToHeatmap(rows, "units", "local");
    expect(m.cells[6][9].units).toBe(1);
    expect(m.rows[6]).toBe("Mon");
  });

  it("revenue mode tracks gold, units mode tracks quantity, both reflect maxIntensity", () => {
    const t = Math.floor(new Date(2026, 3, 7, 18, 0, 0).getTime() / 1000);
    const rows = [
      row({ time: t, quantity: 3, price: 50000 }), // 15g
      row({ time: t, quantity: 2, price: 50000 }), // 10g
    ];
    const u = binToHeatmap(rows, "units", "local");
    const r = binToHeatmap(rows, "revenue", "local");
    expect(u.maxIntensity).toBe(5);
    expect(r.maxIntensity).toBeCloseTo(25, 4);
  });

  it("computes median sale price per cell", () => {
    const t = Math.floor(new Date(2026, 3, 7, 18, 0, 0).getTime() / 1000);
    const rows = [
      row({ time: t, quantity: 1, price: 40000 }),
      row({ time: t, quantity: 1, price: 50000 }),
      row({ time: t, quantity: 1, price: 60000 }),
    ];
    const m = binToHeatmap(rows, "units", "local");
    expect(m.cells[0][18].medianPriceGold).toBeCloseTo(5, 4);
  });
});
