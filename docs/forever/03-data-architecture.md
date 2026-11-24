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
| 3 | Parsing runs on the main thread, on whole-file strings | `lib/client-load.ts:9` reads `f.text()`; `lib/parse-worker.ts` exists but nothing imports it | The UI freezes for the length of the parse, and the file is held in memory twice. |
| 4 | Every item or range change re-filters all rows on the main thread | `components/Dashboard.tsx:138`, `163-177`; `lib/transform.ts:35-48` (four full scans); `components/panels/SellThroughPanel.tsx:19` | Cost is O(all rows) per interaction, and the result is a row array handed to each chart, so charts scale with rows too. |
| 5 | Scope is a realm name parsed from the filename | `lib/realm.ts:5-6`, `lib/load.ts:21-34` | Forever has no realms **[C]** and the token TSM writes is unknown **[U]**. The regex also rejects an empty token, underscores and non-ASCII names. |
| 6 | Item identity is the display name; random-enchant gear is `itemName === "?"` | `lib/items.ts:8-14`, `56-61`; repeated in `lib/sellthrough.ts:37,42` | Forever random suffixes appear to be bonus IDs **[U]**; the `"?"` rule may never fire. |
| 7 | Tuesday is a module constant | `lib/weeks.ts:3`, and again as a literal in `lib/heatmap.ts:47` | EU weeks probably start Wednesday **[S]**. |
| 8 | Week keys mix local time and UTC | `lib/cashflow.ts:18-21` formats a local-midnight date with `toISOString()` | East of UTC the key names the previous day. |
| 9 | Bad input is coerced silently | `lib/parse.ts:10-17` turns anything unparseable into `0`; headers are never checked | A changed Forever schema would load as rows of zeros with no warning. |
| 10 | Fixed 0.25g histogram buckets; one bubble per row | `lib/charts.ts:189`, `84-105` | Wrong bucket for a 3-silver cloth or a 400g crystal; Chart.js degrades past ~10k bubbles. |
| 11 | Gold is summed as floats | `lib/csv.ts:51-55` divides by 10,000; `lib/transform.ts:66` converts each row before adding | Totals drift by fractions of a copper. The new design sums integer copper and converts once, for display. |
| 12 | P&L sums every source | `lib/transform.ts:62-86` has no `source` filter | Vendor, Trade and COD rows are mixed into "revenue − cost". Sample: 120,158g bought all-source vs 115,238g at auction. A house cut must never touch those rows. |

What stays: the row schema, and the rule that a recorded sale price is not taxed
again (`lib/transform.ts:59`, `84`).

## 2. `EditionProfile`

Everything edition-specific lives in one object. No module outside
`lib/editions/` may mention a realm, a weekday, a cut rate, or `"?"`.

```ts
type Tagged<T> = { value: T; confidence: "confirmed" | "single-source" | "unknown" };
type House = "alliance" | "horde" | "blackwater" | "unassigned";
type Capability =
  | "sales" | "purchases" | "listingOutcomes" | "ledger"   // which files are present
  | "houseAttribution" | "priceBasisConfirmed"             // §3, §7
  | "pnlComputable"            // derived: net basis, or gross basis with houseAttribution
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
  calendar: {
    weekAnchor: Record<string, Tagged<WeekAnchor>>;  // by region; "*" = default
    events: { date: string; label: string }[];       // markers for time axes
  };
  items: {
    keyOf(variant: Variant): string;             // display key; applied at cube build (§4)
    randomEnchant: { patterns: RegExp[]; nameIs?: string; groupLabel: string };
    commodity: "none" | "inferred-stackable";
    curated: string[]; defaultItem: string | null;
    histogramBucketCopper?: number;              // Classic only, until the histogram is deleted
  };
  names: { twoPart: boolean };
  marketContext: null | { slugFor(scope: Scope): string | null };
};
type WeekAnchor =
  | { mode: "utc"; dow: number; hour: number }   // a fixed instant; independent of display zone
  | { mode: "local-midnight"; dow: number };     // today's behaviour: midnight in the display zone
```

### Classic Anniversary — reproduces today exactly

| Field | Value | Today's source |
| --- | --- | --- |
| `files.pattern` | today's regex; `tokenMeaning: "realm"` | `lib/realm.ts:5-6` |
| `scope` | `regions: null`, `rulesets: null`, `houses: ["unassigned"]` | — |
| `fees.cutByHouse.unassigned` | 0.05, confirmed | PRD |
| `fees.priceBasis` | `"net"`, confirmed, **not editable** | `lib/transform.ts:59` |
| `calendar.weekAnchor["*"]` | `local-midnight`, Tuesday — kept as a named mode for parity | `lib/weeks.ts:3-11` |
| `calendar.events` | `[]` | — |
| `items.keyOf` | the variant's name, except `"?"` → the synthetic key | `lib/items.ts:8-10` |
| `items.randomEnchant` | `nameIs: "?"` only, no patterns; label `DE Gear (random enchant)` | `lib/csv.ts:49` |
| `items.commodity` | `"none"` | — |
| `items.curated`, `defaultItem` | the 13-entry list; `Arcane Dust` | `lib/curated.ts:7-23` |
| `items.histogramBucketCopper` | 2500 | `lib/charts.ts:189` |
| `marketContext` | `null` | — |

With this profile a new realm shows one confirmation with everything
pre-filled (edition, dataset named after the token, every character assigned to
it); the bundled sample skips even that. Net P&L is `Σ price × quantity` with no
cut applied, and weeks run Tue–Mon. The existing 37 tests must pass unchanged.

Classic keeps the name rule alone: in the sample 5,304 rows match
`/^i:\d+:-?\d+/` but only 3,079 are named `"?"`, so the two are not equivalent.

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
| `weekAnchor` | us: Tue 15:00 UTC; eu: Wed 04:00 UTC; kr/tw: none | **[S]**, inferred; kr/tw **[U]** | Per-dataset setting, `mode: "utc"`. KR/TW datasets are pre-filled with the US value and marked unconfirmed. |
| `calendar.events` | launch 2026-11-04; raids open 2026-12-09 | **[C]** | |
| `items.keyOf` | the variant's base ID (`/^i:(\d+)/`) | **[U]** | Display name = most frequent non-`"?"` name among that ID's variants. |
| `randomEnchant.patterns` | `[/^i:\d+:-?\d+/, /^i:\d+::/]`, plus `nameIs: "?"` | **[U]** | A guess. Per-dataset editable; the import report shows match counts and samples for each pattern. |
| `items.commodity` | `"inferred-stackable"` (max `stackSize` seen > 1) | mechanism **[C]**, per-item list **[U]** | Overridable per item; surfaced as "inferred". |
| `curated` / `defaultItem` | `[]` / `null` → top items by revenue in the dataset | — | No item list is assumed for a three-week-old economy. |
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
- House is a **derived column** on each event, not a storage partition. No row
  says which house it used, and any character can trade on Blackwater, so
  faction is not house. Each event gets a `house` and a `houseBasis`:
  1. A `houseRules` entry matches (character, item or group, time range → house):
     that house, basis `rule`.
  2. Otherwise an auction row takes its character's faction house. The basis is
     `rule` if the character is marked "uses Blackwater: never", and `assumed`
     if marked "sometimes" (the default).
  3. Non-auction sources are `unassigned`.
- `houseAttribution` coverage is the share of auction revenue with basis `rule`.
  Everything else is labelled "faction house (assumed)" wherever it is shown.
- Changing a rule rebuilds cubes (§6) and rewrites no stored rows. Switching
  house is a lane filter. Switching dataset hydrates another store; the worker
  keeps the two most recent. Twelve markets per region is 4 datasets × 3 lanes.

**Import-time mapping.** The routing key is **(token, character) → dataset**,
not the token alone: the client's realm name is now empty (`02-forever-facts.md`),
so one token can cover characters on several rulesets, and character names are
unique per region **[C]**. One file may therefore feed several datasets.

A new token opens the mapping step: edition (pre-selected from hints), region,
then one row per character — ruleset, faction, uses Blackwater. A known token
with known characters imports with no dialog; a new character under a known
token re-opens the step for that character only. If TSM later writes a different
token, the characters are recognised and it is attached to their datasets.

**Per-dataset settings** (`DatasetSettings`, defaults from the profile):
`priceBasis`, `cutByHouse`, `weekAnchor`, `displayTz` (IANA name or `"UTC"`,
default the browser zone — markets span many zones **[C]**), `characters`
(faction, uses Blackwater), `houseRules`, `randomEnchantPatterns`,
`commodityOverrides`, `misScopedBefore`.

URL state gains `?ds=<dataset slug>&house=<house|all>`; `?item=` carries an item
key or group ID, not a display name.

## 4. Canonical events and adapters

```ts
type Variant = { itemString: string; baseId: number; name: string };   // one per distinct itemString

type TradeEvent = {
  t: number;                 // unix seconds, UTC
  kind: "buy" | "sell" | "expired" | "canceled";
  variant: number;           // index into the variant dictionary
  qty: number;               // units
  unitCopper: number;        // integer, as recorded; basis is settings.priceBasis. 0 for expired/canceled
  stackSize: number;
  source: "auction" | "vendor" | "trade" | "cod" | "other";
  char: number;              // index into the character dictionary
  partyHash: number;         // FNV-1a 32 of otherPlayer; 0 when absent
};
type LedgerEvent = { t: number; dir: "income" | "expense"; type: number;
  copper: number; char: number; partyHash: number };
```

Events index **variants** (3,098 in the sample), never display items. The
display key — a base item, or a pattern group such as random-enchant gear — is
a variant → key mapping computed at cube build from `keyOf`, the random-enchant
rule and user groups. Editing a pattern rebuilds cubes and rewrites no rows.

Counterparty names are hashed, not stored: the evaluation found nothing in
counterparty analysis, the names would be the largest string table in the store,
and not keeping other players' names is the better privacy position. The hash
still separates a transfer to the trader's own character (it equals the hash of
a known character name) from one to somebody else; in the sample 2,311g of
transfers go to a name that never appears as `player`.

### TSM Accounting adapter

1. **Schema detection.** The header row is compared with the known column sets.
   Extra columns are reported and ignored; a missing required column fails that
   file only.
2. **Row validation.** No silent zeros: a row with a non-numeric field,
   `quantity ≤ 0` or an impossible `time` is rejected and counted.
3. **Validation report**, stored with the import and shown before commit: rows
   accepted and rejected by reason, time span per kind, characters, `source`
   values, matches per random-enchant pattern with samples, rows the merge would
   delete and insert per character, and the checks below. On Forever it also
   flags rows dated before `misScopedBefore` (default 2026-11-19, editable) on
   Roleplay and Roleplay PvP datasets: TSM v4.15–4.15.7 could record those under
   the wrong ruleset (`02-forever-facts.md`).
4. **Commodity row semantics are unknown [U].** Today value is
   `price × quantity`, with `quantity` the total units and `stackSize` the stack
   it was posted in. The report tests that reading instead of trusting it:
   share of rows where `quantity % stackSize ≠ 0`; share where `stackSize >
   quantity`; share of sale rows with an empty `otherPlayer` (the client has a
   "Multiple Buyers" sale-mail string **[C]**; how TSM records such a sale is
   **[U]**); and median unit price against the market-context
   price when that is loaded. If more than 2% of rows fail a check the import
   still completes, value is still computed as `unitCopper × qty`, and the
   dataset carries a `rowSemanticsWarning` every value block can show.

### Merge on re-import

TSM exports are cumulative, so consecutive exports overlap almost entirely, and
TSM may also have trimmed old history between two of them.

- **Each instant belongs to the newest export that covers it.** Per
  (kind, character) the store keeps covered intervals, each stamped with the
  `asOf` of the export that supplied it (that export's latest timestamp). An
  incoming span `[a, b]` is applied piece by piece: uncovered parts are
  inserted; parts under an older or equal `asOf` are replaced; parts under a
  newer one are left alone. The result depends on the set of files imported, not
  their order, and an old backup can fill a gap TSM has since trimmed.
- Replace rather than de-duplicate, because the export is TSM's own state for
  its span: identical same-second rows survive and an amended row cannot double.
- **Warning before commit** when a replacement would delete more stored rows
  than it inserts for a character — the signature of one character recorded on
  two machines that never synced. **Union mode** is offered for that case:
  multiset union, a row's multiplicity being the maximum seen in any one import.
- **Unchanged months are skipped.** Every export re-states all history, so the
  store keeps a row count and content hash per (kind, character, month) and
  writes only months that differ — normally the last one or two.
- Kinds absent from an import are untouched, which fixes row 2 of §1.
- Parsing is streamed in the worker straight into column buffers; the file is
  never read whole into a string and no row objects are built.

### Market-context adapter (optional, off by default)

A public reference price per item, so a block can compare the trader's prices
with the market's.

| Path | Network | Status |
| --- | --- | --- |
| User drops a TSM public-data `items.csv` (`forever/{region}/realm/{ruleset}-{faction}/`, refreshed every few hours; region files daily — `02-forever-facts.md`) | none | Always available. |
| Browser fetches the same file directly | one GET to TSM's public-data host | Opt-in per dataset. Whether that host allows cross-origin reads is **unverified**; if not, only the drop path ships. |
| Blizzard ruleset auction endpoints | needs an OAuth client secret | **Not in a client-only app.** It would require a server, which is a different product decision. |

TSM's terms require attribution and forbid bulk republishing, so this app never
mirrors or proxies those files. Each file is stored under its as-of date, so a
market-value line is a series built up over time, not one snapshot.

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
one object store per database). A new database, `wowahdata`:

| Store | Key | Value |
| --- | --- | --- |
| `meta` | string | `schemaVersion`, `activeDataset`, pins, UI preferences |
| `datasets` | `id` | edition, region, ruleset, label, `settings`, `rev`, row counts, time span |
| `sources` | `[token, character]` | dataset ID |
| `dict` | `[dataset, name]` | `variants`, `chars`, `ledgerTypes` |
| `chunks` | `[dataset, table, yyyymm]` | one month of events as column buffers |
| `coverage` | `[dataset, kind, char]` | covered intervals with `asOf`; per-month row count and hash |
| `cubes` | `[dataset, cube, yyyymm]` | derived; safe to delete |
| `imports` | `[dataset, importedAt]` | file names, validation report, rows added/replaced |
| `pipelines` | `[dataset, id]` | pipelines and item groups (§8) |
| `market` | `[edition, region, slug, asOfDate]` | parsed price file, source |

**Chunk layout.** Month-partitioned, one `ArrayBuffer` per column: `t` Uint32,
`variant` Uint32, `qty` Uint32, `unitCopper` Float64 (exact integers to 2⁵³;
Uint32 overflows above 429,496g), `stackSize` Uint32, `partyHash` Uint32, `char`
Uint16, `kind` Uint8, `source` Uint8 — 32 bytes per event, sorted by `t`. Typed
arrays store and load without per-row cloning. A month is rewritten only when
its hash changed (§4).

**Migration.** There is no earlier version of `wowahdata` to upgrade: today's
blobs live in idb-keyval's own database, `keyval-store`. On first run the app
opens `keyval-store`, feeds each `wowahdata:realm:<name>` blob through the normal
import path as a Classic Anniversary dataset with token `<name>`, verifies row
counts per kind, and only then deletes the blob. A failed migration leaves the
blob in place and reports it. Later changes go through `schemaVersion`.

**Durability.** This is a multi-year local store: the app calls
`navigator.storage.persist()` after the first import and offers a backup file
holding the trade data itself, not only settings. It is never transmitted.

**Synchronous mirror.** `localStorage` holds dataset labels, `rev` and
capability flags — no trade data — so the shell can decide available or
unavailable on first paint, before the worker has hydrated.

## 6. Compute

One dedicated Worker owns the hydrated dataset: dictionaries, chunks, cubes. The
main thread holds query results only.

### Cubes

The time atom is the **UTC hour**; day, weekday × hour, week and month are
rollups computed per query, so nothing is rebuilt when the zone or anchor
changes. Days and months follow the display zone. Weeks follow the dataset's
`weekAnchor`: in `utc` mode a week is a fixed span of hours and does not move
when the page's zone changes; in `local-midnight` mode (Classic) it moves with
the zone, as today. Zones offset by 30 or 45 minutes are binned by the local
time at the start of each UTC hour; that is the one approximation.

| Cube | Key | Measures | Serves |
| --- | --- | --- | --- |
| `itemHour` | item, hour, lane | units, copper, events | timing grid, series, stats, outcomes, cross-item tables, pipelines, baselines |
| `scopeHour` | hour, lane | units, copper, events | all-items series and timing grid |
| `itemHourPrice` | item, hour, lane (buy/sell only), fine price bin | units, copper | price marks, medians |

All three are persisted per month and built at import. `item` is the display
key; `lane` packs kind × auction/other × house × house basis into one byte.
Cubes are sorted with an offset index per item, so a single-item query touches
at most the active hours in range — bounded by 8,760 a year however many rows
the item has.

There is no weekly cube: it could not answer 7d, 30d, 90d or a custom range.
Cross-item tables, pipelines and baselines roll up from `itemHour` over the
requested range. The sample's `itemHour` holds 6,768 cells for 20,606 events, so
a full pass is roughly 0.4M cells at 1M events; results are memoised in the
worker per (scope, range).

**Fine price bins** are geometric at 0.5% steps:
`bin = floor(ln(unitCopper) / ln(1.005))`. Adjacent bins merge into wider ones
without re-reading anything, a median read from them is exact to ±0.25%, and the
cube stays small: 9,374 cells for the sample's 20,037 buys and sells, a median
of one bin per (item, hour, side).

**Price marks.** A `priceGrid` query merges fine bins into at most `maxBins`
display bins across the requested `priceWindow`: `fit` (visible extent),
`p5-p95` (unit-weighted), `full` (the item's all-time extent, so the axis holds
still as the range changes) or an explicit `{lo, hi}` from a drag. Display bins
are runs of *k* fine bins aligned to multiples of *k*. The result is one mark
per (time bucket, side, display bin) with units and unit-weighted mean price,
plus a median per (time bucket, side) from the fine bins. Mark count is a
function of the axes, never of row count. The Python reference's per-row
jittered bubbles are not produced: a Forever commodity row is of unknown shape,
and one renderer is simpler than two. (Restoring per-row marks for small Classic
datasets is an open decision in `00-overview.md`.)

**Week-normalised price baseline.** The evaluation showed a raw price by hour is
drift in disguise (12.7% raw, −0.7% normalised). `B(item, week)` is the
unit-weighted mean auction sale price over an anchored week, from `itemHour`.
The price index of a timing-grid cell is

```
index(cell) = Σ over hours h in cell of copper(h) / B(item, week(h))
              ───────────────────────────────────────────────────────
                          Σ over hours h in cell of units(h)
```

This equals the per-sale mean of `price / B`, because `B` is constant within a
week — so it comes from the cube with no row access. Weeks with fewer than five
sale events have no baseline; their hours are excluded and the result reports
the share of units covered. The per-cell median price shown today
(`lib/heatmap.ts:53-58`, `105`) misleads and is dropped.

**Timing-grid rows** are days in the display zone, starting with the
display-zone weekday that contains the anchor instant.

### Query API

```ts
type QueryScope = {                              // built by the shell, identical for every block
  dataset: string; house: House | "all";
  range: { from: number; to: number } | "all";   // unix seconds
  tz: string; weekAnchor: WeekAnchor;
  bucket: "day" | "week" | "month";              // derived from the range, never chosen by a block
  source: "auction" | "all";
};
type BlockQuery = QueryScope & (
  | { q: "itemList"; sort: "revenue" | "spend" | "events"; limit?: number }
  | { q: "itemStats"; item: ItemRef }
  | { q: "scopeStats"; subject: "all" | { pipeline: string }; byHouse?: boolean }
  | { q: "timingGrid"; item: ItemRef; kind: "sell" | "buy" }
  | { q: "series"; subject: ItemRef | "all" | { pipeline: string } }
  | { q: "priceGrid"; item: ItemRef; maxBins: number;
      priceWindow: "fit" | "p5-p95" | "full" | { lo: number; hi: number } }
  | { q: "outcomes"; groupBy: "item" | "bucket"; subject?: ItemRef | { pipeline: string };
      sort?: "sold" | "expired" | "canceled" | "soldShare"; limit?: number }
  | { q: "pipelineSummary"; pipeline: string }
  | { q: "ledgerSummary" }
  | { q: "marketCompare"; item: ItemRef }
);
type ItemRef = { item: string } | { group: string };

function useBlockQuery<Q extends BlockQuery>(query: Q, opts?: { enabled?: boolean }): {
  status: "loading" | "ready" | "empty" | "error";
  data: ResultOf<Q> | undefined;
  isStale: boolean;
};
function useCapabilities(scope: QueryScope):
  Record<Capability, { ok: boolean; reason?: string; coverage?: number }>;
```

`ResultOf<Q>` — amounts are integer copper:

| `q` | Result |
| --- | --- |
| `itemList` | rows: ref, label, role, pipeline, commodity flag, bought and sold (units, copper), expired and canceled units |
| `itemStats`, `scopeStats` | bought, sold, expired, canceled (units, copper, events); received; gross and fees as value or low–high range; optional per-house split |
| `timingGrid` | 168-slot arrays: units, revenue, events, `weeksActive`, `occurrences` (times that weekday-hour falls inside the range), `priceIndex`; first-row weekday; baseline coverage |
| `series` | per bucket: start, spend, revenue, units in and out, expired, canceled |
| `priceGrid` | buckets; marks (bucket, side, mean price, units, bin bounds); medians (bucket, side); the resolved window; market-value points when loaded |
| `outcomes` | per item or per bucket: sold, expired, canceled (units, events) |
| `pipelineSummary` | per member: share, received, cost, units; margin; unassigned remainder; with yields, expected output and implied stock |
| `ledgerSummary` | copper per type and direction; transfers split into own characters and others |
| `marketCompare` | market value by as-of date; own mean buy and sell |

- **Cache key** = canonical JSON of the query + `dataset.rev`. `rev` increments
  on import and on any edit to settings, pipelines or groups. The main-thread
  cache is an LRU capped at 2 MB of results, matching §9.
- **Stale-while-revalidate.** When a block's key changes, the hook keeps
  returning the previous `data` with `isStale: true` until the new result
  arrives. `loading` occurs only when a block has never had data.
- **Cancellation.** Latest-wins per block instance: issuing a query cancels that
  block's pending one; the worker drops cancelled requests still in its queue.
- **`enabled: false`** issues nothing and returns the last result, so the shell
  can hold off-screen blocks without blanking them.
- **Capabilities are separate from status.** The shell reads `useCapabilities`
  (seeded from the synchronous mirror, §5) and renders "unavailable" without
  issuing the query, so `status` stays the four values above. `pnlComputable`
  exists so a block's static `requires` can say "needs a P&L figure".
- **Append.** An import rebuilds cubes only for the months whose rows changed,
  then bumps `rev`.

## 7. Fee model

Between what the buyer pays and what the seller receives, the house cut is
applied **exactly once**. `priceBasis` says which side a sale row records.

| `priceBasis` | Received (drives P&L) | Gross (display only) |
| --- | --- | --- |
| `net` — Classic always; Forever default | `unitCopper × qty`, as recorded, no arithmetic | `round(unitCopper × qty / (1 − cut[house]))` |
| `gross` — Forever only, if the user finds TSM records buyer-paid | `floor(unitCopper × qty × (1 − cut[house]))` | `unitCopper × qty`, as recorded |

The conversions are per event. Cubes hold summed recorded copper per lane, and
house is derived, so a converted total is computed on the sum and differs from
the per-event figure by under one copper per sale event in the cell. Recorded
figures — received under `net`, gross under `gross` — are always exact.

- Purchases record what the buyer paid; no cut ever applies.
- `source ≠ auction` has a cut of zero under either basis.
- `NetCopper` and `GrossCopper` are branded types, and one module, `lib/fees.ts`,
  holds the only functions that convert between them. A second deduction then
  fails to type-check.
- Under `net`, P&L needs no house attribution at all; only the gross and
  fees-paid figures do. For auction events whose house basis is `assumed`, those
  figures are shown as a range computed at the lowest and highest cut in the
  profile (5% and 15% on Forever), labelled as such. Classic has one cut, so it
  never shows a range.
- Under `gross`, P&L itself depends on the house. `pnlComputable` is then true
  only with `houseAttribution`; without it P&L blocks show the same low–high
  range rather than one number.
- While `priceBasisConfirmed` is false the dataset is treated as `net` — what
  TSM records on Classic (the existing PRD's rule) — and figures are shown as
  recorded. The
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
  match: { itemStringPatterns?: string[];   // variants → this key, at cube build
           keys?: string[] } };             // display keys summed at query time

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
  and the implied stock not yet sold. All from `itemHour`, rolled up over the
  range.
- **Storage:** per dataset in IndexedDB, included in the backup file (§5).
  Editing a pipeline or group bumps `rev`.
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
| First import | ≤ 1.5 s per 100k incoming rows, parse to queryable |
| Re-import of a mostly unchanged export (the common case) | ≤ 0.6 s per 100k rows to parse and hash; writes and cube rebuilds only for changed months |
| Any import | no main-thread task over 50 ms |
| Cold start to first block | ≤ 300 ms — cubes only; row chunks are not needed to render |
| House switch, item switch, range change, price zoom | ≤ 16 ms worker time per single-item query; previous data stays on screen |
| Cross-item table or pipeline, new range | ≤ 30 ms for the `itemHour` pass; memoised afterwards |
| Dataset switch | ≤ 400 ms to first block |
| Worker memory | 32 MB of events per 1M when hydrated; cubes under half that |
| Main-thread memory for data | ≤ 2 MB |

No query is proportional to rows any more. What breaks first: **parsing a
cumulative export** — every import re-reads all history, hashing saves the
writes but not the parse, and at the extreme row count that is tens of seconds
in the worker (progress shown, page usable). Second, the cross-item pass at 5M
events (about 2M cells) while a custom range is dragged; per-item daily prefix
sums are the fix if it shows. Third, the Forever variant dictionary, if
random-suffix gear carries many itemStrings the pattern guess fails to collapse.

## 10. Tests and migration order

**Tests**

- *Golden numbers* from `__fixtures__/nightslayer`, pinned in copper: row counts
  11,526 / 8,511 / 327 / 242 / 17 / 279; Greater Planar Essence auction sales
  33,712.2605g (already in `lib/__tests__/reconciliation.test.ts:13`); 1,612 rows
  and 5,167 units for the same; DE Gear group 3,014 auction buy rows; 3,098
  variants. Each golden is asserted twice — through the legacy functions and
  through the cube query — until the legacy path is deleted.
- *Cube equals rows.* For random items, ranges, zones and week anchors, every
  cube-backed query equals a brute-force scan of the events; price medians agree
  within ±0.25%. Changing the display zone never changes a `utc`-anchored week.
- *Merge properties* (fast-check): the stored result is the same for every
  ordering of a set of files; importing a file twice changes nothing and writes
  no month; rows outside the incoming span are never altered; a subset of kinds
  never touches the others; union mode is commutative and associative.
- *Merge regression.* January backup, then a current export trimmed to
  April–May, then a backup covering January to mid-April: February and March
  must be present, and April must still be the current export's.
- *Routing.* A file whose characters sit on two rulesets lands in two datasets.
- *Fees.* Under the Classic profile no code path changes a sale amount. Under
  `gross`, received + fee = recorded for every event, and a cube total is within
  its event count in copper of the per-event sum.
- *Pipelines.* Totals plus unassigned equal the portfolio total.
- *Profile parity.* Existing tests run unchanged through the Classic profile.
- *Budgets.* A generator scales the fixture to 1M events; §9 targets run in CI
  with 2× headroom.
- *Privacy.* With market context on, an interception test asserts the only
  outbound request is the whole-market file, with no referrer or query string.

**Order** — each step ships alone, behaviour unchanged until step 6.

1. `EditionProfile` and the Classic profile; `realm.ts`, `weeks.ts`, `items.ts` read from it.
2. Canonical events, the TSM adapter with validation report, streamed parsing in the worker.
3. The `wowahdata` database and the migration out of `keyval-store`.
4. Cubes, `useBlockQuery`, `useCapabilities`; port blocks one at a time; delete the main-thread filters.
5. Merge on re-import, month hashes, backup file.
6. Forever profile, mapping step, dataset settings, fee model.
7. Item groups and pipelines.
8. Market context, drop path first.

## What the other documents must conform to

- A block declares `requires: Capability[]` and one or more `BlockQuery`
  values, and receives nothing else. It must render `isStale` data without
  changing size.
- The shell builds one `QueryScope` — dataset, house, range, zone, week anchor,
  bucket, source — and every block uses it unchanged.
- Item identity is an `ItemRef`. Names are labels.
- The timing grid returns `units`, `revenue`, `weeksActive`, per-cell
  `occurrences` and `priceIndex` (with coverage); no per-cell median price.
- Price marks arrive binned, at most `maxBins` per time bucket and side, each
  with its mean price; the block passes a `priceWindow` and never bins itself.
- Blocks query `source: "auction"`; `"all"` exists so the Classic profile can
  reproduce today's stat cards, which include vendor and trade rows.
- Gross and fee figures may arrive as a low–high range, and auction figures
  whose house basis is `assumed` are labelled as such.
- Counterparty names do not exist in the store.
