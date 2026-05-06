import { type ExpiredCanceledRow, type PurchaseSaleRow, copperToGold } from "./csv";

// ── deterministic PRNG (mulberry32) ───────────────────────────────────────────
// Seeded by time + itemString so re-renders never shuffle bubbles.
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── bubble scatter (port from gpe_scatter.py) ─────────────────────────────────
const MIN_R = 2.5;
const MAX_R = 14.0;
const MAX_QTY_REF = 36;

function bubbleRadius(qty: number): number {
  const bucket = qty > 1 ? Math.max(1, Math.round(qty / 3) * 3) : 1;
  return MIN_R + (MAX_R - MIN_R) * (Math.sqrt(bucket) / Math.sqrt(MAX_QTY_REF));
}

export type ScatterPoint = {
  x: number; // day index (jittered)
  y: number; // price/unit in gold
  r: number; // bubble radius
  qty: number;
  pricePerUnitGold: number;
  totalGold: number;
  side: "buy" | "sell";
  dayLabel: string;
  dayInt: number;
  time: number;
};

export type ScatterData = {
  buys: ScatterPoint[];
  sells: ScatterPoint[];
  dayLabels: string[];
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function buildScatterData(
  buys: PurchaseSaleRow[],
  sells: PurchaseSaleRow[],
): ScatterData {
  const dayMap = new Map<string, { idx: number; label: string }>();
  const collect = (rows: PurchaseSaleRow[]) => {
    for (const r of rows) {
      const d = new Date(r.time * 1000);
      const k = dayKey(d);
      if (!dayMap.has(k)) {
        dayMap.set(k, { idx: 0, label: shortDayLabel(d) });
      }
    }
  };
  collect(buys);
  collect(sells);
  const sortedKeys = [...dayMap.keys()].sort();
  sortedKeys.forEach((k, i) => {
    const v = dayMap.get(k)!;
    v.idx = i;
  });
  const dayLabels = sortedKeys.map((k) => dayMap.get(k)!.label);

  const place = (rows: PurchaseSaleRow[], side: "buy" | "sell") => {
    return rows.map<ScatterPoint>((r) => {
      const d = new Date(r.time * 1000);
      const k = dayKey(d);
      const dayInt = dayMap.get(k)!.idx;
      const rng = mulberry32(hash32(`${r.itemString}:${r.time}:${side}`));
      const jitter = side === "buy" ? -0.05 - rng() * 0.3 : 0.05 + rng() * 0.3;
      const pricePerUnit = copperToGold(r.price);
      return {
        x: dayInt + jitter,
        y: pricePerUnit,
        r: bubbleRadius(r.quantity),
        qty: r.quantity,
        pricePerUnitGold: pricePerUnit,
        totalGold: copperToGold(r.price * r.quantity),
        side,
        dayLabel: dayMap.get(k)!.label,
        dayInt,
        time: r.time,
      };
    });
  };

  return {
    buys: place(buys, "buy"),
    sells: place(sells, "sell"),
    dayLabels,
  };
}

// ── daily P&L ────────────────────────────────────────────────────────────────

export type DailyPnL = {
  dayKey: string;
  dayLabel: string;
  boughtUnits: number;
  boughtCostGold: number;
  soldUnits: number;
  soldRevenueGold: number;
  expiredUnits: number;
  canceledUnits: number;
  netGold: number;
  cumulativeNetGold: number;
};

export function buildDailyPnL(
  buys: PurchaseSaleRow[],
  sells: PurchaseSaleRow[],
  expired: ExpiredCanceledRow[],
  canceled: ExpiredCanceledRow[],
): DailyPnL[] {
  const days = new Map<string, DailyPnL>();
  const ensure = (t: number): DailyPnL => {
    const d = new Date(t * 1000);
    const k = dayKey(d);
    let row = days.get(k);
    if (!row) {
      row = {
        dayKey: k,
        dayLabel: shortDayLabel(d),
        boughtUnits: 0,
        boughtCostGold: 0,
        soldUnits: 0,
        soldRevenueGold: 0,
        expiredUnits: 0,
        canceledUnits: 0,
        netGold: 0,
        cumulativeNetGold: 0,
      };
      days.set(k, row);
    }
    return row;
  };

  for (const b of buys) {
    const r = ensure(b.time);
    r.boughtUnits += b.quantity;
    r.boughtCostGold += copperToGold(b.price * b.quantity);
  }
  for (const s of sells) {
    const r = ensure(s.time);
    r.soldUnits += s.quantity;
    r.soldRevenueGold += copperToGold(s.price * s.quantity);
  }
  for (const e of expired) {
    const r = ensure(e.time);
    r.expiredUnits += e.quantity;
  }
  for (const c of canceled) {
    const r = ensure(c.time);
    r.canceledUnits += c.quantity;
  }

  const sorted = [...days.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  let cum = 0;
  for (const row of sorted) {
    row.netGold = row.soldRevenueGold - row.boughtCostGold;
    cum += row.netGold;
    row.cumulativeNetGold = cum;
  }
  return sorted;
}

// ── price histogram ──────────────────────────────────────────────────────────

const BUCKET_GOLD = 0.25;

export type HistogramBin = {
  bucketStart: number; // gold
  buyUnits: number;
  sellUnits: number;
};

export function buildPriceHistogram(
  buys: PurchaseSaleRow[],
  sells: PurchaseSaleRow[],
): HistogramBin[] {
  const map = new Map<number, HistogramBin>();
  const ensure = (gold: number): HistogramBin => {
    const bucket = Math.floor(gold / BUCKET_GOLD) * BUCKET_GOLD;
    const key = Math.round(bucket * 100); // avoid float keys
    let bin = map.get(key);
    if (!bin) {
      bin = { bucketStart: bucket, buyUnits: 0, sellUnits: 0 };
      map.set(key, bin);
    }
    return bin;
  };
  for (const b of buys) ensure(copperToGold(b.price)).buyUnits += b.quantity;
  for (const s of sells) ensure(copperToGold(s.price)).sellUnits += s.quantity;
  return [...map.values()].sort((a, b) => a.bucketStart - b.bucketStart);
}
