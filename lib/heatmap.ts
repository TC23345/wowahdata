import { type PurchaseSaleRow, copperToGold } from "./csv";
import { TRADING_WEEK_DAYS, type TradingDay, tradingDayIndex } from "./weeks";

export type HeatmapMode = "units" | "revenue";
export type HeatmapTz = "utc" | "local";

export type HeatmapCell = {
  day: TradingDay;
  hour: number; // 0-23
  units: number;
  goldValue: number;
  events: number;
  medianPriceGold: number;
};

export type HeatmapMatrix = {
  rows: TradingDay[]; // ['Tue','Wed','Thu','Fri','Sat','Sun','Mon']
  hours: number[]; // 0..23
  cells: HeatmapCell[][]; // [dayIndex][hour]
  mode: HeatmapMode;
  tz: HeatmapTz;
  totalUnits: number;
  totalGold: number;
  maxIntensity: number;
};

function dateInTz(unixSec: number, tz: HeatmapTz): Date {
  const d = new Date(unixSec * 1000);
  if (tz === "utc") {
    return new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
      ),
    );
  }
  return d;
}

function dayHourFromDate(d: Date, tz: HeatmapTz): { dayIdx: number; hour: number } {
  if (tz === "utc") {
    const dow = d.getUTCDay(); // Sun=0..Sat=6
    const dayIdx = (dow - 2 + 7) % 7;
    return { dayIdx, hour: d.getUTCHours() };
  }
  return { dayIdx: tradingDayIndex(d), hour: d.getHours() };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function binToHeatmap(
  rows: PurchaseSaleRow[],
  mode: HeatmapMode = "units",
  tz: HeatmapTz = "local",
): HeatmapMatrix {
  const cells: HeatmapCell[][] = [];
  const priceBuckets: number[][][] = [];
  for (let d = 0; d < 7; d++) {
    cells.push([]);
    priceBuckets.push([]);
    for (let h = 0; h < 24; h++) {
      cells[d].push({
        day: TRADING_WEEK_DAYS[d],
        hour: h,
        units: 0,
        goldValue: 0,
        events: 0,
        medianPriceGold: 0,
      });
      priceBuckets[d].push([]);
    }
  }

  let totalUnits = 0;
  let totalGold = 0;

  for (const r of rows) {
    const d = tz === "utc" ? new Date(r.time * 1000) : dateInTz(r.time, tz);
    const { dayIdx, hour } = dayHourFromDate(d, tz);
    if (dayIdx < 0 || dayIdx > 6 || hour < 0 || hour > 23) continue;
    const cell = cells[dayIdx][hour];
    const gold = copperToGold(r.price * r.quantity);
    const pricePerUnit = copperToGold(r.price);
    cell.units += r.quantity;
    cell.goldValue += gold;
    cell.events += 1;
    priceBuckets[dayIdx][hour].push(pricePerUnit);
    totalUnits += r.quantity;
    totalGold += gold;
  }

  let maxIntensity = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const cell = cells[d][h];
      cell.medianPriceGold = median(priceBuckets[d][h]);
      const intensity = mode === "units" ? cell.units : cell.goldValue;
      if (intensity > maxIntensity) maxIntensity = intensity;
    }
  }

  return {
    rows: [...TRADING_WEEK_DAYS],
    hours: Array.from({ length: 24 }, (_, i) => i),
    cells,
    mode,
    tz,
    totalUnits,
    totalGold,
    maxIntensity,
  };
}
