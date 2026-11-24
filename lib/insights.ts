// Pure computations behind the workspace blocks
// (docs/forever/05-block-catalog.md). Everything here counts units and copper,
// never rows, and only auction-sourced trades unless a function says otherwise.
//
// These run on the main thread over filtered rows for now. The data
// architecture (docs/forever/03-data-architecture.md §6) moves them behind a
// worker and pre-aggregated cubes; the function signatures are shaped so the
// blocks will not need to change when that happens.

import type { CashFlowRow, ExpiredCanceledRow, LoadedData, PurchaseSaleRow } from "./csv";
import { cellIndex, type HeatmapTz } from "./heatmap";
import { displayName } from "./items";
import { weekStartTuesday } from "./weeks";

export type TradeSet = {
  purchases: PurchaseSaleRow[];
  sales: PurchaseSaleRow[];
  expired: ExpiredCanceledRow[];
  canceled: ExpiredCanceledRow[];
};

export type DateRange = { start: Date; end: Date };

const DAY_MS = 86_400_000;

export function isAuction(r: PurchaseSaleRow): boolean {
  return r.source === "Auction";
}

export function sumUnits(rows: { quantity: number }[]): number {
  let s = 0;
  for (const r of rows) s += r.quantity;
  return s;
}

export function sumCopper(rows: { quantity: number; price: number }[]): number {
  let s = 0;
  for (const r of rows) s += r.price * r.quantity;
  return s;
}

/** sold ÷ (sold + expired + canceled), by units. Null when nothing was listed. */
export function listingSuccess(sold: number, expired: number, canceled: number): number | null {
  const listed = sold + expired + canceled;
  return listed > 0 ? sold / listed : null;
}

// ── roles ────────────────────────────────────────────────────────────────────

export type Role = "input" | "output" | "flip";

/**
 * input  — sold units under 10% of bought units (bought to be converted)
 * output — at least half of sold units were not bought on the AH
 * flip   — everything else
 * Expired units are deliberately not added: relisted stock expires repeatedly.
 */
export function classifyRole(soldUnits: number, boughtUnits: number): Role {
  if (boughtUnits > 0 && soldUnits < 0.1 * boughtUnits) return "input";
  if (soldUnits > 0 && soldUnits - boughtUnits >= 0.5 * soldUnits) return "output";
  return "flip";
}

/** Roles are computed over all time, so they do not flicker as the range changes. */
export function computeRoles(data: LoadedData): Map<string, Role> {
  const sold = new Map<string, number>();
  const bought = new Map<string, number>();
  for (const r of data.sales) if (isAuction(r)) sold.set(displayName(r), (sold.get(displayName(r)) ?? 0) + r.quantity);
  for (const r of data.purchases) if (isAuction(r)) bought.set(displayName(r), (bought.get(displayName(r)) ?? 0) + r.quantity);
  const out = new Map<string, Role>();
  for (const name of new Set([...sold.keys(), ...bought.keys()])) {
    out.set(name, classifyRole(sold.get(name) ?? 0, bought.get(name) ?? 0));
  }
  return out;
}

// ── item ledger ──────────────────────────────────────────────────────────────

export type LedgerRow = {
  name: string;
  role: Role;
  soldUnits: number;
  revenue: number; // copper, as recorded (already net of the AH cut)
  boughtUnits: number;
  spend: number; // copper
  expiredUnits: number;
  canceledUnits: number;
  firstSeen: number; // unix seconds
  lastSeen: number;
};

export function buildLedger(set: TradeSet, roles: Map<string, Role>): LedgerRow[] {
  const map = new Map<string, LedgerRow>();
  const ensure = (name: string, t: number): LedgerRow => {
    let row = map.get(name);
    if (!row) {
      row = {
        name,
        role: roles.get(name) ?? "flip",
        soldUnits: 0,
        revenue: 0,
        boughtUnits: 0,
        spend: 0,
        expiredUnits: 0,
        canceledUnits: 0,
        firstSeen: t,
        lastSeen: t,
      };
      map.set(name, row);
    }
    if (t < row.firstSeen) row.firstSeen = t;
    if (t > row.lastSeen) row.lastSeen = t;
    return row;
  };
  for (const r of set.sales) {
    if (!isAuction(r)) continue;
    const row = ensure(displayName(r), r.time);
    row.soldUnits += r.quantity;
    row.revenue += r.price * r.quantity;
  }
  for (const r of set.purchases) {
    if (!isAuction(r)) continue;
    const row = ensure(displayName(r), r.time);
    row.boughtUnits += r.quantity;
    row.spend += r.price * r.quantity;
  }
  for (const r of set.expired) ensure(displayName(r), r.time).expiredUnits += r.quantity;
  for (const r of set.canceled) ensure(displayName(r), r.time).canceledUnits += r.quantity;
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.spend - a.spend);
}

/** How many items, ranked by revenue, make up `share` of revenue. */
export function itemsForShare(ledger: LedgerRow[], share: number, key: "revenue" | "spend" = "revenue"): number {
  const ranked = [...ledger].sort((a, b) => b[key] - a[key]);
  const total = ranked.reduce((s, r) => s + r[key], 0);
  if (total <= 0) return 0;
  let cum = 0;
  for (let i = 0; i < ranked.length; i++) {
    cum += ranked[i][key];
    if (cum >= share * total) return i + 1;
  }
  return ranked.length;
}

export function cumulativeShares(ledger: LedgerRow[], n: number, key: "revenue" | "spend"): number[] {
  const ranked = [...ledger].sort((a, b) => b[key] - a[key]);
  const total = ranked.reduce((s, r) => s + r[key], 0);
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < Math.min(n, ranked.length); i++) {
    cum += ranked[i][key];
    out.push(total > 0 ? cum / total : 0);
  }
  return out;
}

// ── time buckets ─────────────────────────────────────────────────────────────

export type Bucket = "day" | "week" | "month" | "quarter";

/** The bucket is derived from the range, never chosen by a block. */
export function bucketFor(range: DateRange): Bucket {
  const days = (range.end.getTime() - range.start.getTime()) / DAY_MS;
  if (days <= 42) return "day";
  if (days <= 366) return "week";
  if (days <= 5 * 366) return "month";
  return "quarter";
}

export function bucketStart(d: Date, bucket: Bucket): Date {
  if (bucket === "week") return weekStartTuesday(d);
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  if (bucket === "month") out.setDate(1);
  if (bucket === "quarter") {
    out.setDate(1);
    out.setMonth(Math.floor(out.getMonth() / 3) * 3);
  }
  return out;
}

function nextBucket(d: Date, bucket: Bucket): Date {
  const out = new Date(d);
  if (bucket === "day") out.setDate(out.getDate() + 1);
  else if (bucket === "week") out.setDate(out.getDate() + 7);
  else if (bucket === "month") out.setMonth(out.getMonth() + 1);
  else out.setMonth(out.getMonth() + 3);
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function bucketLabel(d: Date, bucket: Bucket): string {
  if (bucket === "day") return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (bucket === "week") return `Wk of ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  if (bucket === "month") return `${MONTHS[d.getMonth()]} ${yy}`;
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${yy}`;
}

export type BucketAxis = { bucket: Bucket; starts: Date[]; labels: string[]; indexOf: (unixSec: number) => number };

export function bucketAxis(range: DateRange): BucketAxis {
  const bucket = bucketFor(range);
  const starts: Date[] = [];
  for (let d = bucketStart(range.start, bucket); d <= range.end; d = nextBucket(d, bucket)) starts.push(d);
  if (starts.length === 0) starts.push(bucketStart(range.start, bucket));
  const keys = starts.map((d) => d.getTime());
  const indexOf = (unixSec: number) => {
    const t = bucketStart(new Date(unixSec * 1000), bucket).getTime();
    // binary search: keys are ascending
    let lo = 0;
    let hi = keys.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] === t) return mid;
      if (keys[mid] < t) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  };
  return { bucket, starts, labels: starts.map((d) => bucketLabel(d, bucket)), indexOf };
}

// ── per-bucket series ────────────────────────────────────────────────────────

export type OutcomeBucket = { sold: number; expired: number; canceled: number };

export function outcomesByBucket(set: TradeSet, axis: BucketAxis): OutcomeBucket[] {
  const out = axis.starts.map(() => ({ sold: 0, expired: 0, canceled: 0 }));
  const add = (t: number, k: keyof OutcomeBucket, q: number) => {
    const i = axis.indexOf(t);
    if (i >= 0) out[i][k] += q;
  };
  for (const r of set.sales) if (isAuction(r)) add(r.time, "sold", r.quantity);
  for (const r of set.expired) add(r.time, "expired", r.quantity);
  for (const r of set.canceled) add(r.time, "canceled", r.quantity);
  return out;
}

export type FlowBucket = { spend: number; revenue: number; cumSpend: number; cumRevenue: number };

export function flowByBucket(set: TradeSet, axis: BucketAxis): FlowBucket[] {
  const spend = axis.starts.map(() => 0);
  const revenue = axis.starts.map(() => 0);
  for (const r of set.purchases) {
    if (!isAuction(r)) continue;
    const i = axis.indexOf(r.time);
    if (i >= 0) spend[i] += r.price * r.quantity;
  }
  for (const r of set.sales) {
    if (!isAuction(r)) continue;
    const i = axis.indexOf(r.time);
    if (i >= 0) revenue[i] += r.price * r.quantity;
  }
  let cs = 0;
  let cr = 0;
  return axis.starts.map((_, i) => {
    cs += spend[i];
    cr += revenue[i];
    return { spend: spend[i], revenue: revenue[i], cumSpend: cs, cumRevenue: cr };
  });
}

/** Quantity-weighted median of unit prices, in copper. Null for no rows. */
export function weightedMedianPrice(rows: { price: number; quantity: number }[]): number | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.price - b.price);
  const total = sumUnits(sorted);
  let acc = 0;
  for (const r of sorted) {
    acc += r.quantity;
    if (acc >= total / 2) return r.price;
  }
  return sorted[sorted.length - 1].price;
}

export type SpreadBucket = {
  buy: number | null;
  sell: number | null;
  buyUnits: number;
  sellUnits: number;
};

export function spreadByBucket(set: TradeSet, axis: BucketAxis): SpreadBucket[] {
  const buys = axis.starts.map(() => [] as PurchaseSaleRow[]);
  const sells = axis.starts.map(() => [] as PurchaseSaleRow[]);
  for (const r of set.purchases) {
    if (!isAuction(r)) continue;
    const i = axis.indexOf(r.time);
    if (i >= 0) buys[i].push(r);
  }
  for (const r of set.sales) {
    if (!isAuction(r)) continue;
    const i = axis.indexOf(r.time);
    if (i >= 0) sells[i].push(r);
  }
  return axis.starts.map((_, i) => ({
    buy: weightedMedianPrice(buys[i]),
    sell: weightedMedianPrice(sells[i]),
    buyUnits: sumUnits(buys[i]),
    sellUnits: sumUnits(sells[i]),
  }));
}

// ── listing windows ──────────────────────────────────────────────────────────

export type ListingWindow = { hours: number; start: number; units: number; share: number };

/**
 * For each listing duration, the contiguous run of week slots (168 hourly
 * slots, wrapping from the last day back to the first) holding the most units.
 */
export function bestListingWindows(units168: number[], durations: number[]): ListingWindow[] {
  const total = units168.reduce((s, u) => s + u, 0);
  return durations.map((hours) => {
    let bestStart = 0;
    let best = -1;
    let run = 0;
    for (let k = 0; k < hours; k++) run += units168[k % 168];
    for (let start = 0; start < 168; start++) {
      if (run > best) {
        best = run;
        bestStart = start;
      }
      run += units168[(start + hours) % 168] - units168[start];
    }
    return { hours, start: bestStart, units: best, share: total > 0 ? best / total : 0 };
  });
}

/** Best contiguous run of `hours` in the 24-hour profile (summed over days). */
export function peakHours(units168: number[], hours: number): { start: number; share: number } {
  const byHour = Array.from({ length: 24 }, (_, h) => {
    let s = 0;
    for (let d = 0; d < 7; d++) s += units168[d * 24 + h];
    return s;
  });
  const total = byHour.reduce((s, u) => s + u, 0);
  let best = -1;
  let bestStart = 0;
  for (let start = 0; start < 24; start++) {
    let run = 0;
    for (let k = 0; k < hours; k++) run += byHour[(start + k) % 24];
    if (run > best) {
      best = run;
      bestStart = start;
    }
  }
  return { start: bestStart, share: total > 0 ? best / total : 0 };
}

// ── pipelines ────────────────────────────────────────────────────────────────

export type PipelineSide = { name: string; copper: number; units: number }[];

export type PipelineSummary = {
  inputs: PipelineSide; // what member items cost, ranked
  outputs: PipelineSide; // what member items earned, ranked
  inputOther: { count: number; copper: number };
  outputOther: { count: number; copper: number };
  spend: number;
  revenue: number;
  margin: number; // revenue − spend over all members, both sides
  memberCount: number;
  soldUnits: number;
  expiredUnits: number;
  canceledUnits: number;
};

/** The generated "All conversions" pipeline: every input and output item. */
export function allConversions(ledger: LedgerRow[], top = 6): PipelineSummary {
  const members = ledger.filter((r) => r.role !== "flip");
  const bySpend = members.filter((r) => r.spend > 0).sort((a, b) => b.spend - a.spend);
  const byRevenue = members.filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const side = (rows: LedgerRow[], key: "spend" | "revenue", unitKey: "boughtUnits" | "soldUnits") =>
    rows.slice(0, top).map((r) => ({ name: r.name, copper: r[key], units: r[unitKey] }));
  const rest = (rows: LedgerRow[], key: "spend" | "revenue") => ({
    count: Math.max(0, rows.length - top),
    copper: rows.slice(top).reduce((s, r) => s + r[key], 0),
  });
  const spend = members.reduce((s, r) => s + r.spend, 0);
  const revenue = members.reduce((s, r) => s + r.revenue, 0);
  return {
    inputs: side(bySpend, "spend", "boughtUnits"),
    outputs: side(byRevenue, "revenue", "soldUnits"),
    inputOther: rest(bySpend, "spend"),
    outputOther: rest(byRevenue, "revenue"),
    spend,
    revenue,
    margin: revenue - spend,
    memberCount: members.length,
    soldUnits: members.reduce((s, r) => s + r.soldUnits, 0),
    expiredUnits: members.reduce((s, r) => s + r.expiredUnits, 0),
    canceledUnits: members.reduce((s, r) => s + r.canceledUnits, 0),
  };
}

// ── fees and upkeep ──────────────────────────────────────────────────────────

export type FeesSummary = {
  categories: { type: string; copper: number; entries: number }[];
  total: number;
  transfersOwn: { sent: number; received: number };
  transfersOther: { sent: number; received: number };
};

export function feesSummary(income: CashFlowRow[], expenses: CashFlowRow[], ownCharacters: Set<string>): FeesSummary {
  const cats = new Map<string, { copper: number; entries: number }>();
  const transfersOwn = { sent: 0, received: 0 };
  const transfersOther = { sent: 0, received: 0 };
  for (const r of expenses) {
    if (r.type === "Money Transfer") {
      if (ownCharacters.has(r.otherPlayer)) transfersOwn.sent += r.amount;
      else transfersOther.sent += r.amount;
      continue;
    }
    const c = cats.get(r.type) ?? { copper: 0, entries: 0 };
    c.copper += r.amount;
    c.entries += 1;
    cats.set(r.type, c);
  }
  for (const r of income) {
    if (r.type !== "Money Transfer") continue;
    if (ownCharacters.has(r.otherPlayer)) transfersOwn.received += r.amount;
    else transfersOther.received += r.amount;
  }
  const categories = [...cats.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.copper - a.copper);
  return { categories, total: categories.reduce((s, c) => s + c.copper, 0), transfersOwn, transfersOther };
}

/** Characters that appear as the acting player anywhere in the export. */
export function ownCharacters(data: LoadedData): Set<string> {
  const s = new Set<string>();
  for (const rows of [data.purchases, data.sales, data.expired, data.canceled, data.income, data.expenses]) {
    for (const r of rows) s.add(r.player);
  }
  return s;
}

// ── timing consistency ───────────────────────────────────────────────────────

export type CellConsistency = {
  /** Distinct reset weeks in which each week slot had at least one sale. */
  weeksActive: number[];
  /** How many times each week slot occurs inside the range. */
  occurrences: number[];
};

function weekKey(unixSec: number, tz: HeatmapTz): number {
  if (tz === "utc") return Math.floor((unixSec / 86_400 - 5) / 7); // epoch day 5 is a Tuesday
  return weekStartTuesday(new Date(unixSec * 1000)).getTime();
}

/**
 * "Consistency" separates demand from accident: a slot that sold in 10 of 11
 * weeks is a pattern, one large sale in 1 of 11 is not. Each slot is compared
 * with how often it actually occurred in the range, so ragged ranges are fair.
 */
export function cellConsistency(rows: PurchaseSaleRow[], tz: HeatmapTz, range: DateRange): CellConsistency {
  const sets = Array.from({ length: 168 }, () => new Set<number>());
  for (const r of rows) sets[cellIndex(r.time, tz)].add(weekKey(r.time, tz));
  const occurrences = new Array<number>(168).fill(0);
  const start = Math.ceil(range.start.getTime() / 3_600_000) * 3600;
  const end = Math.floor(range.end.getTime() / 1000);
  for (let t = start; t <= end; t += 3600) occurrences[cellIndex(t, tz)] += 1;
  return { weeksActive: sets.map((s) => s.size), occurrences };
}
