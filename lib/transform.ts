import {
  type CashFlowRow,
  type ExpiredCanceledRow,
  type LoadedData,
  type PurchaseSaleRow,
  copperToGold,
} from "./csv";
import { filterByDisplayName } from "./items";

export type DateRange = { start: Date; end: Date };

function inRange(unixSeconds: number, range?: DateRange): boolean {
  if (!range) return true;
  const ms = unixSeconds * 1000;
  return ms >= range.start.getTime() && ms <= range.end.getTime();
}

function timeFilter<T extends { time: number }>(rows: T[], range?: DateRange): T[] {
  if (!range) return rows;
  return rows.filter((r) => inRange(r.time, range));
}

export type ItemFilteredData = {
  purchases: PurchaseSaleRow[];
  sales: PurchaseSaleRow[];
  expired: ExpiredCanceledRow[];
  canceled: ExpiredCanceledRow[];
  income: CashFlowRow[];
  expenses: CashFlowRow[];
};

// Filter all four item-bound row collections by the active item, then optionally
// by date range. Income/expenses are not item-bound — they pass through with
// only the date filter applied.
export function filterForItem(
  loaded: LoadedData,
  itemName: string,
  range?: DateRange,
): ItemFilteredData {
  return {
    purchases: timeFilter(filterByDisplayName(loaded.purchases, itemName), range),
    sales: timeFilter(filterByDisplayName(loaded.sales, itemName), range),
    expired: timeFilter(filterByDisplayName(loaded.expired, itemName), range),
    canceled: timeFilter(filterByDisplayName(loaded.canceled, itemName), range),
    income: timeFilter(loaded.income, range),
    expenses: timeFilter(loaded.expenses, range),
  };
}

export type ItemStats = {
  boughtUnits: number;
  boughtCostGold: number;
  soldUnits: number;
  soldRevenueGold: number;
  avgReceivedGold: number; // gold per unit, weighted by quantity
  expiredUnits: number;
  canceledUnits: number;
  impliedDeSourcedUnits: number; // sold + expired - bought, clamped at 0
  netPnlGold: number; // sold revenue - bought cost (no extra 5% — TSM price is already net of AH cut)
};

export function statsForItem(d: ItemFilteredData): ItemStats {
  const sumQty = (rows: { quantity: number }[]) =>
    rows.reduce((s, r) => s + r.quantity, 0);
  const sumGold = (rows: { quantity: number; price: number }[]) =>
    rows.reduce((s, r) => s + copperToGold(r.price * r.quantity), 0);

  const boughtUnits = sumQty(d.purchases);
  const boughtCostGold = sumGold(d.purchases);
  const soldUnits = sumQty(d.sales);
  const soldRevenueGold = sumGold(d.sales);
  const expiredUnits = sumQty(d.expired);
  const canceledUnits = sumQty(d.canceled);

  return {
    boughtUnits,
    boughtCostGold,
    soldUnits,
    soldRevenueGold,
    avgReceivedGold: soldUnits > 0 ? soldRevenueGold / soldUnits : 0,
    expiredUnits,
    canceledUnits,
    impliedDeSourcedUnits: Math.max(0, soldUnits + expiredUnits - boughtUnits),
    netPnlGold: soldRevenueGold - boughtCostGold,
  };
}

export function dateRangeOf(loaded: LoadedData): DateRange | null {
  const all = [
    ...loaded.purchases,
    ...loaded.sales,
    ...loaded.expired,
    ...loaded.canceled,
    ...loaded.income,
    ...loaded.expenses,
  ];
  if (all.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const r of all) {
    if (r.time < min) min = r.time;
    if (r.time > max) max = r.time;
  }
  return { start: new Date(min * 1000), end: new Date(max * 1000) };
}
