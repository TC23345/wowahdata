---
name: tsm-data
description: Use when parsing, transforming, or visualizing TradeSkillMaster (TSM) Accounting CSV exports for World of Warcraft auction house data. Covers the six-file schema (purchases, sales, expired, canceled, income, expenses), field semantics that defy reasonable assumptions (price is copper per unit; sale price is already net of the 5% AH cut; time is Unix epoch UTC seconds; source enum includes COD; itemName "?" rows are random-enchant gear), realm extraction from filenames, Tue–Mon week boundary math, item-list aggregation, day-of-week × hour-of-day heatmap binning, and the bubble-chart jitter and sqrt area-scaling math ported from gpe_scatter.py. Activate whenever the agent works with files matching `Accounting_<Realm>_*.csv` or builds aggregations, charts, or fixtures on top of them, even if the user does not name TSM explicitly.
---

# TSM Accounting CSV data

TradeSkillMaster (TSM) is a WoW addon that exports six CSVs from its Accounting module. This skill is the source of truth for parsing them and the easy-to-miss semantics that have already burned past implementations of this dashboard.

## File set

All files match `Accounting_<Realm>_<kind>.csv`. Realm is extracted from the filename — never hardcoded. A user may upload any subset; missing files disable affected views, they are not an error.

| Kind | Schema (columns) |
| ---- | ---- |
| `purchases` | `itemString, itemName, stackSize, quantity, price, otherPlayer, player, time, source` |
| `sales` | same 9 columns as purchases |
| `expired` | `itemString, itemName, stackSize, quantity, player, time` |
| `canceled` | same 6 columns as expired |
| `income` | `type, amount, otherPlayer, player, time` |
| `expenses` | same 5 columns as income |

## Gotchas (pin these in code)

- **`price` is copper, per unit.** Divide by 10000 for gold. Transaction value = `price × quantity / 10000` gold. Never multiply by `stackSize` — `stackSize` is the original listing's stack, `quantity` is the units actually moved in that row.
- **TSM sale `price` is already net of the 5% AH cut.** Do NOT apply another 5% deduction when computing revenue or P&L. Seller receives `price × quantity / 10000`. If you need the listed (pre-cut) price, divide by 0.95.
- **`time` is Unix epoch seconds, UTC** — not milliseconds. Multiply by 1000 before passing to `new Date()`.
- **`source` enum is open.** Observed values across real exports: `Auction`, `Vendor`, `Trade`, `Mail`, `COD`. Type as `string`, not a closed union; default unknowns to passthrough rather than throwing. Most analytical views filter to `source === 'Auction'`.
- **Random-enchant gear has `itemName == "?"`** with `itemString` like `i:24673:-39` (item id + suffix). Aggregate every `?` row under one synthetic item named **"DE Gear (random enchant)"** in the item list and in filtering. Hide that synthetic name from search-by-name results so users do not see a literal `?` entry.
- **Weeks run Tuesday → Monday**, not Mon→Sun or Sun→Sat. WoW's reset day is Tuesday; weekly views must snap to weekday Tue. See recipe below.
- **`income` / `expenses` files can be empty** (header only, 0 rows) on accounts with no inter-character money transfers. The parser must handle that without throwing. `expenses` types observed: `Postage`, `Money Transfer`, `Repair Bill`. `income` types observed: `Money Transfer`. Both fields are open strings.
- **`amount` on income/expenses is also copper.** Divide by 10000 for gold.
- **Realm names can contain spaces, apostrophes, and hyphens** (e.g. `Mal'Ganis`, `Earthen Ring`). The filename regex must accommodate those.

## Type definitions

```ts
export type TsmKind =
  | 'purchases' | 'sales' | 'expired' | 'canceled' | 'income' | 'expenses';

export type PurchaseSaleRow = {
  itemString: string;
  itemName: string;
  stackSize: number;
  quantity: number;
  price: number;          // copper, per unit
  otherPlayer: string;
  player: string;
  time: number;           // unix seconds UTC
  source: string;         // 'Auction' | 'Vendor' | 'Trade' | 'Mail' | 'COD' | string
};

export type ExpiredCanceledRow = {
  itemString: string;
  itemName: string;
  stackSize: number;
  quantity: number;
  player: string;
  time: number;
};

export type CashFlowRow = {
  type: string;           // open string — 'Money Transfer' | 'Postage' | 'Repair Bill' | ...
  amount: number;         // copper
  otherPlayer: string;
  player: string;
  time: number;
};

export type LoadedData = {
  realm: string;
  purchases: PurchaseSaleRow[];
  sales: PurchaseSaleRow[];
  expired: ExpiredCanceledRow[];
  canceled: ExpiredCanceledRow[];
  income: CashFlowRow[];
  expenses: CashFlowRow[];
  loadedAt: number;
};
```

## Recipes

### Realm extraction from filename

```ts
const RE = /^Accounting_([A-Za-z'\- ]+)_(purchases|sales|expired|canceled|income|expenses)\.csv$/;
export function realmFromFilename(name: string) {
  const m = RE.exec(name);
  if (!m) return null;
  return { realm: m[1], kind: m[2] as TsmKind };
}
```

### Tue–Mon week boundary

```ts
// Snap any date to the Tuesday that starts its trading week (Sun=0, Mon=1, Tue=2, ...).
export function weekStartTuesday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const daysSinceTue = (out.getDay() - 2 + 7) % 7;
  out.setDate(out.getDate() - daysSinceTue);
  return out;
}
```

TSM times are UTC; if showing the user's local week, snap on local time. The UI must expose a TZ toggle (UTC vs local) and persist it in URL params.

### Item list with random-enchant aggregation

```ts
const SYNTH = 'DE Gear (random enchant)';
export function displayName(row: { itemName: string }) {
  return row.itemName === '?' ? SYNTH : row.itemName;
}
```

When the user picks `SYNTH` from the dropdown, filter rows by `itemName === '?'`. Do not surface `SYNTH` in `itemName.includes(query)` substring search results — pin it as its own entry in the curated list.

### Heatmap binning (the hero feature)

For a chosen item and date window, build a 7×24 matrix:

- **Rows** = day-of-week ordered **Tue, Wed, Thu, Fri, Sat, Sun, Mon** (matches the trading week, not Sun–Sat or Mon–Sun).
- **Cols** = hour-of-day 0–23 in the active TZ.
- Each cell aggregates rows from `sales` (or `purchases` in buy mode) where `displayName(row) === selectedItem`:
  - `units`: `Σ quantity`
  - `revenue` (sales) or `cost` (buys): `Σ price × quantity / 10000`
  - `events`: row count
  - `medianPrice`: median of per-unit `price / 10000`

Color scale defaults to `units`; toggle for `revenue`. **Empty cells must render in the page surface color**, not the zero end of the colormap, so "no data" is visually distinct from "sold zero."

### Bubble scatter math (port from gpe_scatter.py)

```
MIN_R = 2.5
MAX_R = 14.0
MAX_QTY_REF = 36
bucket = qty > 1 ? Math.max(1, Math.round(qty / 3) * 3) : 1
r      = MIN_R + (MAX_R - MIN_R) * Math.sqrt(bucket) / Math.sqrt(MAX_QTY_REF)
```

Jitter is seeded (`random.seed(42)` in the reference). Use a deterministic PRNG (e.g. mulberry32 seeded by `time` or by `(itemString + time)`) so re-renders don't shuffle bubbles:

- buys: uniform in `[-0.35, -0.05]` from the day's integer x position
- sells: uniform in `[+0.05, +0.35]`

## Validation invariants for tests

When writing Vitest cases against scrubbed real-export fixtures, assert at least:

1. `realmFromFilename('Accounting_Nightslayer_sales.csv')` → `{ realm: 'Nightslayer', kind: 'sales' }`.
2. `realmFromFilename("Accounting_Mal'Ganis_purchases.csv")` → `{ realm: "Mal'Ganis", kind: 'purchases' }`.
3. A sale row with `price=64092` has `pricePerUnitGold === 6.4092`.
4. A sale row with `price=57807, quantity=3` produces revenue `17.3421` gold (no extra 5% deduction).
5. A row with `source='COD'` parses without throwing and round-trips through `LoadedData`.
6. Every `itemName === '?'` row aggregates under `'DE Gear (random enchant)'`; that synthetic name does not appear in substring search results for the literal `?`.
7. `weekStartTuesday(new Date('2026-04-07T12:00:00Z'))` returns the same Tuesday at 00:00 local. For `2026-04-06` (Mon) it returns the prior Tuesday `2026-03-31`.
8. Header-only `Accounting_<Realm>_income.csv` parses to `income: []` without throwing; same for `expenses`.
9. Total sale gold for a known item over a known window equals what an out-of-band reconciliation (e.g. `awk -F',' '$2=="Greater Planar Essence" && $9=="Auction" {s+=$5*$4} END{print s/10000}'`) produces from the source CSV.
10. Heatmap row order is `['Tue','Wed','Thu','Fri','Sat','Sun','Mon']`, not `['Sun', ...]` or `['Mon', ...]`.

## When in doubt

- Run `head -3` on the relevant fixture before guessing a column order — TSM has added columns historically and may again.
- If a row count from a fixture diverges from the on-disk row count by exactly 1, it's almost certainly a header-line off-by-one — count data rows as `wc -l - 1`.
