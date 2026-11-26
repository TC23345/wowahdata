import {
  type ExpiredCanceledRow,
  type LoadedData,
  type PurchaseSaleRow,
  SYNTHETIC_DE_GEAR,
} from "./csv";

export function displayName<T extends { itemName: string }>(row: T): string {
  return row.itemName === "?" ? SYNTHETIC_DE_GEAR : row.itemName;
}

export function isRandomEnchant(row: { itemName: string }): boolean {
  return row.itemName === "?";
}

export type ItemSummary = {
  name: string;
  txnCount: number;
  soldUnits: number;
  isSynthetic: boolean;
};

// Aggregate every unique displayName across purchases, sales, expired, canceled.
// Returns sorted by txnCount descending (ties broken by name so the order is
// stable). The synthetic DE Gear bucket merges all itemName === "?" rows and
// is flagged so the UI can pin it.
export function aggregateItems(loaded: LoadedData): ItemSummary[] {
  const counts = new Map<string, number>();
  const sold = new Map<string, number>();
  const tally = (rows: { itemName: string }[]) => {
    for (const r of rows) {
      const name = displayName(r);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  };
  tally(loaded.purchases);
  tally(loaded.sales);
  tally(loaded.expired);
  tally(loaded.canceled);
  for (const r of loaded.sales) {
    const name = displayName(r);
    sold.set(name, (sold.get(name) ?? 0) + r.quantity);
  }

  const out: ItemSummary[] = [];
  for (const [name, txnCount] of counts) {
    out.push({
      name,
      txnCount,
      soldUnits: sold.get(name) ?? 0,
      isSynthetic: name === SYNTHETIC_DE_GEAR,
    });
  }
  out.sort((a, b) => b.txnCount - a.txnCount || a.name.localeCompare(b.name));
  return out;
}

// The item the dashboard opens on: whatever sold the most units in the loaded
// data. Falls back to the most-traded item when nothing was sold, and to null
// when the data has no item rows at all (e.g. only income/expense files).
export function defaultItem(items: ItemSummary[]): string | null {
  let best: ItemSummary | null = null;
  for (const i of items) {
    if (i.soldUnits > 0 && (!best || i.soldUnits > best.soldUnits)) best = i;
  }
  return best?.name ?? items[0]?.name ?? null;
}

// Chips shown above the search box: the most-traded items in the loaded data.
// The synthetic DE Gear bucket is excluded from text search, so it is always
// appended when present to keep it reachable.
export function topItemChips(items: ItemSummary[], count: number): ItemSummary[] {
  const top = items.slice(0, count);
  const synth = items.find((i) => i.isSynthetic);
  if (synth && !top.includes(synth)) top.push(synth);
  return top;
}

// Substring search. Excludes the synthetic bucket so users do not see a literal
// "?" entry — the synthetic bucket is surfaced as a chip instead (topItemChips).
export function searchItems(items: ItemSummary[], query: string): ItemSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.filter((i) => !i.isSynthetic);
  return items.filter(
    (i) => !i.isSynthetic && i.name.toLowerCase().includes(q)
  );
}

export function filterByDisplayName<
  T extends PurchaseSaleRow | ExpiredCanceledRow,
>(rows: T[], name: string): T[] {
  if (name === SYNTHETIC_DE_GEAR) return rows.filter((r) => r.itemName === "?");
  return rows.filter((r) => r.itemName === name);
}
