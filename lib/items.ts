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
  isSynthetic: boolean;
};

// Aggregate every unique displayName across purchases, sales, expired, canceled.
// Returns sorted by txnCount descending. The synthetic DE Gear bucket merges
// all itemName === "?" rows and is flagged so the UI can pin it.
export function aggregateItems(loaded: LoadedData): ItemSummary[] {
  const counts = new Map<string, number>();
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

  const out: ItemSummary[] = [];
  for (const [name, txnCount] of counts) {
    out.push({ name, txnCount, isSynthetic: name === SYNTHETIC_DE_GEAR });
  }
  out.sort((a, b) => b.txnCount - a.txnCount);
  return out;
}

// Substring search. Excludes the synthetic bucket so users do not see a literal
// "?" entry — the synthetic bucket is surfaced via the curated pin list instead.
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
