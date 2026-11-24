# Data architecture for the Forever edition

Scope: everything between a dropped file and the numbers a block renders. Layout
is in `04-layout-system.md`, block definitions in `05-block-catalog.md`.

Forever facts carry the research brief's tags: **[C]** confirmed, **[S]**
single-source, **[U]** unknown. Every **[U]** is a per-dataset setting, never a
constant. Budgets in §9 are design targets, not measurements.

## 1. What does not carry over from today's data layer

| # | Today | Where | Why it fails |
| --- | --- | --- | --- |
| 1 | A realm's whole dataset is one IndexedDB value | `lib/storage.ts:13-16`, `18-21` | Every load and save structured-clones every row. Fine at 21k rows; at 1M it is a ~200 MB value copied on each import. |
| 2 | Import replaces, never merges | `lib/parse.ts:88-101` fills absent kinds with `[]`; `components/Dashboard.tsx:75-79` saves that over the realm key | "Upload more files" with only a new `sales.csv` deletes the stored purchases, expired, canceled, income and expenses. The README promises "drop any subset". |
| 3 | Parsing runs on the main thread | `lib/client-load.ts:5-12`; `lib/parse-worker.ts` exists but nothing imports it | The UI freezes for the length of the parse. |
| 4 | Every item or range change re-filters all rows on the main thread | `components/Dashboard.tsx:138`, `163-177`; `lib/transform.ts:35-48` (four full scans); `components/panels/SellThroughPanel.tsx:19` | Cost is O(all rows) per interaction, and the result is a row array handed to each chart, so charts scale with rows too. |
| 5 | Scope is a realm name parsed from the filename | `lib/realm.ts:5-6`, `lib/load.ts:21-34` | Forever has no realms **[C]** and the token TSM writes is unknown **[U]**. The regex also rejects an empty token, underscores and non-ASCII names. |
| 6 | Item identity is the display name; random-enchant gear is `itemName === "?"` | `lib/items.ts:8-14`, `56-61`; repeated in `lib/sellthrough.ts:37,42` | Forever random suffixes appear to be bonus IDs **[U]**; the `"?"` rule may never fire. |
| 7 | Tuesday is a module constant | `lib/weeks.ts:3`, and again as a literal in `lib/heatmap.ts:47` | EU weeks probably start Wednesday **[S]**. |
| 8 | Week keys mix local time and UTC | `lib/cashflow.ts:18-21` formats a local-midnight date with `toISOString()` | East of UTC the key names the previous day. |
| 9 | Bad input is coerced silently | `lib/parse.ts:10-17` turns anything unparseable into `0`; headers are never checked | A changed Forever schema would load as rows of zeros with no warning. |
| 10 | Fixed 0.25g histogram buckets; one bubble per row | `lib/charts.ts:189`, `84-105` | Wrong bucket for a 3-silver cloth or a 400g crystal; Chart.js degrades past ~10k bubbles. |
| 11 | P&L sums every source | `lib/transform.ts:62-86` has no `source` filter | Vendor, Trade and COD rows are mixed into "revenue − cost". Sample: 120,158g bought all-source vs 115,238g at auction. A house cut must never touch those rows. |

What stays: the row schema, integer-copper arithmetic (`lib/csv.ts:51-55`), the
seeded jitter and bubble radius (`lib/charts.ts:5-32`), and the rule that a
recorded sale price is not taxed again (`lib/transform.ts:59`, `84`).

## 2. `EditionProfile`

Everything edition-specific lives in one object. No module outside
`lib/editions/` may mention a realm, a weekday, a cut rate, or `"?"`.

```ts
type Tagged<T> = { value: T; confidence: "confirmed" | "single-source" | "unknown" };
type House = "alliance" | "horde" | "blackwater" | "unassigned";
type Capability =
  | "sales" | "purchases" | "listingOutcomes" | "ledger"   // which files are present
  | "houseAttribution" | "priceBasisConfirmed"             // §3, §7
  | "commodityFlag" | "weekBaseline" | "pipelines"
  | "marketContext.daily" | "marketContext.hourly";        // hourly needs a server: never ok in this app

type EditionProfile = {
  id: "classic-anniversary" | "forever";
  files: { pattern: RegExp; tokenMeaning: "realm" | "opaque" };  // captures (token, kind)
  scope: {
    regions: string[] | null;                    // null = not a dimension
    rulesets: Record<string, string[]> | null;   // region → rulesets
    houses: House[];
  };
  fees: {
    cutByHouse: Partial<Record<House, Tagged<number>>>;
    priceBasis: Tagged<"net" | "gross">;         // which side a sale row records
    listingHours: Tagged<number[]>;
  };
  calendar: { weekStartDow: Record<string, Tagged<number>> };  // by region; "*" = default
  items: {
    keyOf(row: RawItemRow): string;              // identity used for grouping
    randomEnchant: { patterns: RegExp[]; nameIs?: string; groupLabel: string };
    commodity: "none" | "inferred-stackable";
    curated: string[]; defaultItem: string | null;
    histogramBucketCopper: number | "auto";
  };
  names: { twoPart: boolean };
  marketContext: null | { slugFor(scope: Scope): string | null };
};
```

### Classic Anniversary — reproduces today exactly

| Field | Value | Today's source |
| --- | --- | --- |
| `files.pattern` | today's regex; `tokenMeaning: "realm"` | `lib/realm.ts:5-6` |
| `scope` | `regions: null`, `rulesets: null`, `houses: ["unassigned"]` | — |
| `fees.cutByHouse.unassigned` | 0.05, confirmed | PRD |
| `fees.priceBasis` | `"net"`, confirmed, **not editable** | `lib/transform.ts:59` |
| `calendar.weekStartDow["*"]` | 2 (Tuesday), confirmed | `lib/weeks.ts:3` |
| `items.keyOf` | `itemName`, except `"?"` → the synthetic key | `lib/items.ts:8-10` |
| `items.randomEnchant` | `nameIs: "?"`, label `DE Gear (random enchant)` | `lib/csv.ts:49` |
| `items.commodity` | `"none"` | — |
| `items.curated`, `defaultItem` | the 13-entry list; `Arcane Dust` | `lib/curated.ts:7-23` |
| `items.histogramBucketCopper` | 2500 | `lib/charts.ts:189` |
| `marketContext` | `null` | — |

With this profile the import dialog never appears (the token *is* the scope),
net P&L is `Σ price × quantity / 10000` with no cut applied, and weeks run
Tue–Mon. The existing 37 tests must pass unchanged against it.

### Forever

| Field | Default | Tag | Consequence |
| --- | --- | --- | --- |
| `files.pattern` | `/^Accounting_(.*)_(purchases\|sales\|expired\|canceled\|income\|expenses)(?: \(\d+\))?\.csv$/`, `tokenMeaning: "opaque"` | **[U]** | Token may be empty, a ruleset name, or a shard string. It is only a label for the mapping step (§3). |
| `scope.regions` | `us, eu, kr, tw` | **[C]** | |
| `scope.rulesets` | us/eu: `normal, pvp, roleplay, roleplay-pvp`; kr/tw: `normal, pvp` | **[C]** | Hardcore is announced, not live: the map is data, a new key adds it. |
| `scope.houses` | `alliance, horde, blackwater` (+ `unassigned`) | **[C]** | |
| `cutByHouse` | 0.05 / 0.05 / 0.15 | **[S]** | Editable per dataset. |
| `priceBasis` | `"net"` | **[U]** | Per-dataset setting; `priceBasisConfirmed` is false until the user confirms. |
| `listingHours` | `[2, 8, 24]` | **[C]** | |
| `weekStartDow` | us: 2 **[C: maintenance day only]**, eu: 3 **[S]**, kr/tw: 2 **[U]** | mixed | Per-dataset setting. Reset *hour* is inferred everywhere, so weeks start at midnight in the display timezone. |
| `items.keyOf` | numeric base ID from `itemString` (`/^i:(\d+)/`) | **[U]** | Display name = most frequent non-`"?"` name seen for that ID. |
| `randomEnchant.patterns` | `[/^i:\d+:-?\d+/, /^i:\d+::/]`, plus `nameIs: "?"` | **[U]** | Per-dataset editable; the import report shows match counts and samples for each pattern. |
| `items.commodity` | `"inferred-stackable"` (max `stackSize` seen > 1) | mechanism **[C]**, per-item list **[U]** | Overridable per item; surfaced as "inferred". |
| `curated` / `defaultItem` | `[]` / `null` → top items by revenue in the dataset | — | No item list is assumed for a three-week-old economy. |
| `histogramBucketCopper` | `"auto"` | — | 1–2–5 ladder targeting ~40 buckets across p1–p99 of the item's prices. |
| `names.twoPart` | `true` | **[C]** | Names contain a space; nothing may split on whitespace. |
| `marketContext.slugFor` | `{ruleset}-{faction}`; `null` for Blackwater | **[C]** for the slugs that exist | Blackwater has no public price file. |

Not modelled: deposits (formula unverified **[S]**; no deposit rows appear in
the sample export), bids, the Black Market AH (players cannot list there **[C]**).

## 3. Scope model

```
Dataset  = edition × region × ruleset          one import lineage, one worker-owned store
Market   = Dataset × house                     a filter inside the dataset
```

- A dataset never trades with another: mail and trade are ruleset-locked
  **[C]**. Up to four per region.
- House is a **derived column** on each event, not a storage partition. The CSV
  has no house column, so house comes from rules applied in the worker:
  1. `charFaction`: each distinct `player` is assigned Alliance or Horde once, at
     import. Faction houses are separate **[C]**, so this fixes the house for
     ordinary auction rows.
  2. `houseRules`: ordered overrides — character, item/group, and time range →
     house — for Blackwater trading, which no row reveals.
  3. Non-auction sources and anything unmatched are `unassigned`.
- Changing a rule rebuilds cubes (§6) and rewrites no stored rows. Switching
  house is a lane filter. Switching dataset hydrates another store; the worker
  keeps the two most recent. Twelve markets per region is 4 datasets × 3 lanes.

**Import-time mapping.** Files are grouped by token. A token already attached to
a dataset imports with no dialog. A new token opens one step: edition (pre-selected
from hints — two-part player names, itemString shape), region, ruleset, then the
character → faction table. The token is stored in `dataset.sourceTokens[]`; if
TSM later changes what it writes, the user attaches the new token to the same
dataset and history is preserved.

**Per-dataset settings** (`DatasetSettings`, defaults from the profile):
`priceBasis`, `cutByHouse`, `weekStartDow`, `displayTz` (IANA name or `"UTC"`,
default the browser zone — markets span many zones **[C]**), `charFaction`,
`houseRules`, `randomEnchantPatterns`, `commodityOverrides`.

URL state gains `?ds=<dataset slug>&house=<house|all>`; `?item=` carries an item
key or group ID, not a display name.

## 4. Canonical events and adapters

```ts
type TradeEvent = {
  t: number;                 // unix seconds, UTC
  kind: "buy" | "sell" | "expired" | "canceled";
  item: number;              // index into the item dictionary
  qty: number;               // units
  unitCopper: number;        // as recorded; basis is dataset.settings.priceBasis. 0 for expired/canceled
  stackSize: number;
  source: "auction" | "vendor" | "trade" | "cod" | "other";
  char: number;              // index into the character dictionary
  partyHash: number;         // FNV-1a 32 of otherPlayer; 0 when absent
};
type LedgerEvent = { t: number; dir: "income" | "expense"; type: number; copper: number; char: number };
```

Counterparty names are hashed, not stored: the evaluation found nothing in
counterparty analysis, the name dictionary would be the largest string table in
the store, and not keeping other players' names is the better privacy position.

### TSM Accounting adapter

1. **Schema detection.** The header row is compared with the known column sets.
   Extra columns are reported and ignored; a missing required column fails that
   file only.
2. **Row validation.** No silent zeros: a row with a non-numeric field,
   `quantity ≤ 0` or an impossible `time` is rejected and counted.
3. **Validation report**, stored with the import and shown before commit: rows
   accepted and rejected by reason, time span per kind, characters, `source`
   values, matches per random-enchant pattern with samples, and the checks below.
4. **Commodity row semantics are unknown [U].** Today value is
   `price × quantity`, with `quantity` the total units and `stackSize` the stack
   it was posted in. The report tests that reading instead of trusting it:
   share of rows where `quantity % stackSize ≠ 0`; share where `stackSize >
   quantity`; share of sale rows with an empty `otherPlayer` (one sale mail can
   cover multiple buyers **[C]**); and median unit price against the market-context
   price when that is loaded. If more than 2% of rows fail a check the import
   still completes, value is still computed as `unitCopper × qty`, and the
   dataset carries a `rowSemanticsWarning` every value block can show.

### Merge on re-import

TSM exports are cumulative, so consecutive exports overlap almost entirely.

- **Default: span-replace per (kind, character).** For each character in the
  incoming file with rows spanning `[a, b]`, delete that character's stored rows
  of that kind in `[a, b]` and insert the incoming ones. Reason: the newest
  export is TSM's own state for the span it covers, so this is idempotent, keeps
  legitimately identical rows (two same-second sales at the same price), and is
  immune to TSM changing a row after the fact.
- **An export older than stored coverage only backfills.** If the incoming
  `b` is earlier than the stored maximum for that group, only rows before the
  stored minimum are inserted; the rest are reported as "already covered". Import
  order then does not matter for nested exports.
- **Opt-in "union" mode** for one character recorded on two machines that never
  synced: multiset union, a row's multiplicity being the maximum seen in any one
  import.
- Kinds absent from an import are untouched, which fixes row 2 of §1.

### Market-context adapter (optional, off by default)

A public reference price per item, so a block can compare the trader's prices
with the market's.

| Path | Network | Status |
| --- | --- | --- |
| User drops a TSM public-data `items.csv` | none | Always available. |
| Browser fetches the same file directly | one GET to TSM's public-data host | Opt-in per dataset. Whether that host allows cross-origin reads is **unverified**; if not, only the drop path ships. |
| Blizzard ruleset auction endpoints | needs an OAuth client secret | **Not in a client-only app.** It would require a server, which is a different product decision. |

TSM's terms require attribution and forbid bulk republishing, so this app never
mirrors or proxies those files.

What this does to the promise: it becomes "your trading data never leaves your
browser", and remains literally true. With market context on, the price host
learns the user's IP and which region and ruleset-faction market they asked for.
The following are never sent anywhere: rows, item names or IDs, character names,
counterparty hashes, gold totals, source tokens, pipeline definitions. Two rules
enforce it: fetch **whole-market files only**, never a per-item request (that
would disclose what the trader deals in), and send `referrerPolicy:
"no-referrer"` because `?item=` is in the page URL.

## 5. Storage

Native IndexedDB through the `idb` wrapper, replacing `idb-keyval` (which gives
one object store per database). Database `wowahdata`, version 2:

| Store | Key | Value |
| --- | --- | --- |
| `meta` | string | `schemaVersion`, `activeDataset`, UI preferences |
| `datasets` | `id` | edition, region, ruleset, label, `sourceTokens`, `settings`, `rev`, row counts, time span |
| `dict` | `[dataset, name]` | `items` (key, itemString samples, display name, max stack), `chars`, `ledgerTypes` |
| `chunks` | `[dataset, table, yyyymm]` | one month of events as column buffers |
| `cubes` | `[dataset, cube, yyyymm]` | derived; safe to delete |
| `imports` | `[dataset, importedAt]` | file names, validation report, rows added/replaced |
| `pipelines` | `[dataset, id]` | §8 |
| `market` | `[edition, region, slug]` | parsed price file, `fetchedAt`, source |

**Chunk layout.** Month-partitioned, one `ArrayBuffer` per column:
`t` Uint32, `item` Uint32, `qty` Uint32, `unitCopper` Float64 (exact integers to
2⁵³; Uint32 overflows above 429,496g), `stackSize` Uint32, `partyHash` Uint32,
`char` Uint16, `kind` Uint8, `source` Uint8 — 32 bytes per event, sorted by
`t`. An import rewrites only the months it touches, and typed arrays store and
load without per-row cloning.

**Versioning.** `schemaVersion` gates an ordered list of migrations.
Version 1 → 2 reads each `wowahdata:realm:<name>` blob from the old `keyval`
store, feeds it through the normal import path as a Classic Anniversary dataset
with token `<name>`, verifies row counts per kind, and only then deletes the
blob. A failed migration leaves the blob in place and reports it.

## 6. Compute

One dedicated Worker owns the hydrated dataset: dictionaries, chunks, cubes. The
main thread holds query results only.

### Cubes

The time atom is the **UTC hour**. Day, weekday × hour and week are rollups
computed for the query's timezone and week start, so changing either setting
needs no rebuild. Zones offset by 30 or 45 minutes are binned by the local time
at the start of each UTC hour; that is the one approximation.

| Cube | Key | Measures | Serves |
| --- | --- | --- | --- |
| `itemHour` (base) | item, hour, lane | units, copper, events | timing grid, daily series, stats, outcomes for one item |
| `scopeHour` | hour, lane | units, copper, events | all-items series and timing grid |
| `itemWeek` | item, week, lane | units, copper, events | cross-item tables, pipelines, weekly baselines |
| `priceGrid` (lazy, per item) | day, price bucket, side | units, events | price timeline, per-bucket medians |

`lane` packs kind × auction/other × house into one byte. Cubes are sparse and
sorted with an offset index per item, so a single-item query touches at most the
active hours in range — bounded by 8,760 a year however many rows the item has.
`itemWeek` is rebuilt from `itemHour` when week start or timezone changes.
`priceGrid` is built on first request and cached for the 32 most recent items.

**Week-normalised price baseline.** The evaluation showed a raw price by hour is
drift in disguise (12.7% raw, −0.7% normalised). `B(item, week)` is the
unit-weighted mean auction sale price, from `itemWeek`. The price index of a
timing-grid cell is

```
index(cell) = Σ over hours h in cell of copper(h) / B(item, week(h))
              ───────────────────────────────────────────────────────
                          Σ over hours h in cell of units(h)
```

This equals the per-sale mean of `price / B`, because `B` is constant within a
week — so it comes from the cube with no row access. Weeks with fewer than five
sale events have no baseline; their hours are excluded and the result reports
the share of units covered. The per-cell median price shown today
(`lib/heatmap.ts:53-58`, `105`) needs rows and misleads; it is dropped.

**Price marks are always binned.** A `priceGrid` query returns one mark per
(time bucket, price bin, side) with summed units, plus the unit-weighted median
bin per (time bucket, side). The time bucket is day, reset week or month, chosen
from the range as `05-block-catalog.md` §2 specifies, and price bins follow a
1–2–5 ladder in copper capped at `maxBins`. Mark count is therefore a function
of the axes and never of row count. The per-row jittered bubbles of the Python
reference are not produced: a Forever commodity row is of unknown shape, and one
renderer is simpler than two. (Restoring per-row marks for small Classic
datasets is an open decision in `00-overview.md`.)

### Query API

```ts
type QueryScope = {
  dataset: string; house: House | "all";
  range: { from: number; to: number } | "all";   // unix seconds
  tz: string; source: "auction" | "all";
};
type BlockQuery = QueryScope & (
  | { q: "itemList"; sort: "revenue" | "spend" | "events"; limit?: number }   // rows carry role, pipeline, kind, totals, outcomes
  | { q: "itemStats"; item: ItemRef }
  | { q: "scopeStats"; subject: "all" | { pipeline: string }; byHouse?: boolean }
  | { q: "timingGrid"; item: ItemRef; kind: "sell" | "buy" }
      // one result carries units, revenue, events, weeksActive and priceIndex per cell,
      // plus weeksInRange — the block's toolbar switches measure without a new query
  | { q: "series"; subject: ItemRef | "all" | { pipeline: string }; bucket: Bucket }
  | { q: "priceGrid"; item: ItemRef; bucket: Bucket; maxBins: number }
  | { q: "outcomes"; groupBy: "item" | "bucket"; subject?: ItemRef | { pipeline: string };
      bucket?: Bucket; limit?: number }
  | { q: "pipelineSummary"; pipeline: string }
  | { q: "ledgerSummary" }
  | { q: "marketCompare"; item: ItemRef }
);
type ItemRef = { item: string } | { group: string };
type Bucket = "day" | "week" | "month";          // derived from the range by the shell, never chosen by a block

function useBlockQuery<Q extends BlockQuery>(query: Q, opts?: { enabled?: boolean }): {
  status: "loading" | "ready" | "empty" | "error";
  data: ResultOf<Q> | undefined;
  isStale: boolean;
};
function useCapabilities(scope: QueryScope):
  Record<Capability, { ok: boolean; reason?: string; coverage?: number }>;
```

- **Cache key** = canonical JSON of the query + `dataset.rev`. `rev` increments
  on import and on any settings change. Main-thread LRU of 64 results.
- **Stale-while-revalidate.** When a block's key changes, the hook keeps
  returning the previous `data` with `isStale: true` until the new result
  arrives. `loading` occurs only when a block has never had data.
- **Cancellation.** Latest-wins per block instance: issuing a query cancels that
  block's pending one; the worker drops cancelled requests still in its queue.
- **`enabled: false`** issues nothing and returns the last result, so the shell
  can hold off-screen blocks without blanking them.
- **Capabilities are separate from status.** The shell reads `useCapabilities`
  and renders "unavailable" without issuing the query, so `status` stays the four
  values above.
- **Append.** An import rebuilds `itemHour` and `scopeHour` only for the months
  it touched, then bumps `rev`.

## 7. Fee model

Between what the buyer pays and what the seller receives, the house cut is
applied **exactly once**. `priceBasis` says which side a sale row records.

| `priceBasis` | Received (drives P&L) | Gross (display only) |
| --- | --- | --- |
| `net` — Classic always; Forever default | `unitCopper × qty`, as recorded, no arithmetic | `round(unitCopper × qty / (1 − cut[house]))` |
| `gross` — Forever only, if the user finds TSM records buyer-paid | `floor(unitCopper × qty × (1 − cut[house]))` | `unitCopper × qty`, as recorded |

- Purchases record what the buyer paid; no cut ever applies.
- `source ≠ auction` has a cut of zero under either basis.
- `NetCopper` and `GrossCopper` are branded types, and one module, `lib/fees.ts`,
  holds the only functions that convert between them. A second deduction then
  fails to type-check.
- Under `net`, P&L needs no house attribution at all; only the gross and
  fees-paid figures do. For events whose house is `unassigned`, those figures are
  shown as a range computed at the lowest and highest cut in the profile (5% and
  15% on Forever), labelled as such. Classic defines a cut for `unassigned`, so it
  never shows a range.
- Under `gross`, P&L itself depends on the house. Blocks that show P&L then
  require `houseAttribution`; without it they show the same low–high range
  rather than one number.
- While `priceBasisConfirmed` is false the dataset is treated as `net` — what
  TSM records in every other edition — and figures are shown as recorded. The
  uncertainty is surfaced once, as "price basis unconfirmed" on the dataset
  status chip and in the footer of every block that shows gold, not as a range
  on every number: a 15% band would swamp the 4–7% spreads the tool exists to
  show.
- The export offers no reliable automatic test for the basis. Settings has a
  one-sale check: enter a listing price you remember and see which basis
  reproduces the recorded figure.

## 8. Conversion pipelines

The export never links a purchase to what it became. That link is user
configuration.

```ts
type ItemGroup = { id: string; label: string;
  match: { keys?: string[]; itemStringPatterns?: string[] } };

type Pipeline = {
  id: string; label: string;
  inputs:  { ref: ItemRef; share: number }[];   // share of this item's cost claimed, 0–1
  outputs: { ref: ItemRef; share: number }[];
  yields?: { input: ItemRef; output: ItemRef; unitsOutPerUnitIn: number }[];
  includeNonAuction: boolean;
};
```

- The synthetic "DE Gear (random enchant)" entry becomes a built-in `ItemGroup`
  generated from the profile's random-enchant rule; users can extend it with
  named gear they also buy to disenchant.
- **Inferred roles:** an item is an *input* when its sold units are under 10%
  of its bought units (sample: DE Gear, Netherweave Cloth, Nexus Crystal, Lesser
  Planar Essence), an *output* when `sold − bought` is at least half of units
  sold (Arcane Dust, Greater Planar Essence, Large Prismatic Shard, Bolt of
  Netherweave, the bags), otherwise a *flip*. Expired units are not added:
  relisted stock expires more than once. The observed ratio of output units sold
  to input units bought is reported per pair.
- **Generated default:** one pipeline, "All conversions", holding every input
  and output at share 1, and one single-item pipeline per flip, so the Pipeline
  workspace is useful before anything is configured.
- **Must be configured:** which inputs feed which outputs, expected yields, and
  the split when one input feeds several pipelines.
- **Invariant:** across all pipelines the `share` values for an item sum to at
  most 1. The remainder is reported as "unassigned", so pipeline totals plus
  unassigned equal the portfolio total.
- **What it computes:** per range, pipeline margin = Σ over members of
  `share × (received − cost)`, counting every member on both sides: an output
  that was also bought on the AH contributes that cost, an input that was partly
  resold contributes that revenue. This is what makes pipelines plus unassigned
  equal the portfolio. On the sample, "All conversions" is 99,085g sold −
  108,776g bought = −9,691g, and with the 48 flips (−2,208g) reaches the
  portfolio's −11,899g. Also units in and out and, with yields, expected output
  and the implied stock not yet sold. All from `itemWeek`.
- **Storage:** per dataset in IndexedDB. With no server, settings, groups and
  pipelines export and import as one JSON file, which is never transmitted.
- The Classic profile ships two unconfirmed templates (disenchanting, Netherweave
  tailoring). The Forever profile ships none.

## 9. Scale targets and budgets

Personal accounting data grows with one trader's activity and with time. It does
not grow with the market: 3.3M listings **[S]** is someone else's dataset.

| | Rows |
| --- | ---: |
| Sample, 105 days | 20,902 (≈200/day; median 151, max 712 for buys + sales) |
| This trader, 1 year | ≈73k |
| Heavy trader (3×), 5 years of an evergreen game | ≈1.1M |
| Extreme (10×), 5 years | ≈3.6M |

Design point: **1M events per dataset comfortable, 5M must still work.**

| Operation | Target at 1M events |
| --- | --- |
| Import, parse to queryable | ≤ 1.5 s per 100k incoming rows; no main-thread task over 50 ms |
| Cold start to first block | ≤ 300 ms — cubes load first, row chunks on demand |
| House switch, item switch, range change | ≤ 16 ms worker time per cube query; previous data stays on screen |
| Dataset switch | ≤ 400 ms to first block |
| `priceGrid`, first build for a 100k-row item | ≤ 100 ms; cached afterwards |
| Worker memory | 32 MB of events per 1M, cubes under half that |
| Main-thread memory for data | ≤ 2 MB |

What breaks first: a `priceGrid` for one item with hundreds of thousands of
rows, the only query still proportional to rows (mitigation: persist it per
month like the other cubes). After that, the Forever item dictionary if
random-suffix variants fail to collapse into their group.

## 10. Tests and migration order

**Tests**

- *Golden numbers* from `__fixtures__/nightslayer`, pinned in copper: row counts
  11,526 / 8,511 / 327 / 242 / 17 / 279; Greater Planar Essence auction sales
  33,712.2605g (already in `lib/__tests__/reconciliation.test.ts:13`); 1,612 rows
  and 5,167 units for the same; DE Gear group 3,014 auction buy rows. Each golden is asserted twice — through the legacy functions
  and through the cube query — until the legacy path is deleted.
- *Cube equals rows.* For random items, ranges, zones and week starts, every
  cube-backed query equals a brute-force scan of the events.
- *Merge properties* (fast-check): importing the same file twice changes nothing;
  importing a prefix then the full export equals importing the full export, in
  either order; rows outside the incoming span are never altered; a subset of
  kinds never touches the others; union mode is commutative and associative.
- *Fees.* Under the Classic profile no code path changes a sale amount. Under
  `gross`, received + fee = recorded for every event.
- *Pipelines.* Totals plus unassigned equal the portfolio total.
- *Profile parity.* Existing tests run unchanged through the Classic profile.
- *Budgets.* A generator scales the fixture to 1M events; §9 targets run in CI
  with 2× headroom.
- *Privacy.* With market context on, an interception test asserts the only
  outbound request is the whole-market file, with no referrer or query string.

**Order** — each step ships alone, behaviour unchanged until step 6.

1. `EditionProfile` and the Classic profile; `realm.ts`, `weeks.ts`, `items.ts` read from it.
2. Canonical events, the TSM adapter with validation report, parsing in the worker.
3. IndexedDB v2 and the v1 → v2 migration.
4. Cubes, `useBlockQuery`, `useCapabilities`; port blocks one at a time; delete the main-thread filters.
5. Merge on re-import.
6. Forever profile, mapping step, dataset settings, fee model.
7. Item groups and pipelines.
8. Market context, drop path first.

## What the other documents must conform to

- A block declares `requires: Capability[]` and one or more `BlockQuery`
  values, and receives nothing else. It must render `isStale` data without
  changing size.
- Item identity is an `ItemRef`. Names are labels.
- Timezone and week start are query inputs with per-dataset defaults; no block
  assumes Tuesday or local time.
- The timing grid offers `units`, `revenue`, `weeksActive` and `priceIndex`
  (with coverage). There is no per-cell median price.
- Price marks arrive binned, at most `maxBins` per time bucket and side.
- Blocks query `source: "auction"`, as the catalog specifies; `"all"` exists so
  the Classic profile can reproduce today's stat cards, which include vendor and
  trade rows, until they are ported.
- Any gross or fees figure may arrive as a low–high range.
- Counterparty names do not exist in the store.
