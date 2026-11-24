# Block catalog

What the Forever edition shows, in which fixed arrangement, and why. Evidence
figures are from `01-evaluation.md` (the Nightslayer sample); Forever facts and
their confidence tags are from `02-forever-facts.md`. Sizes (`kpi`, `S`, `M`,
`L`, `XL`), the block chrome and the page bars are defined in
`04-layout-system.md`; capabilities and aggregates are produced as described in
`03-data-architecture.md`.

## 1. Principles

1. **Timing is the hero.** The best 6-hour window holds 49–56% of units for the
   top three items against 7–11% for the worst; nothing else in the data swings
   3.5–8×.
2. **The clock explains volume, not price.** A 12.7% raw time-of-day price gap on
   Large Prismatic Shard is about +1% once each sale is divided by its week's
   average; no block may colour or rank by an un-normalised price per time slot.
3. **Price is always drawn against time.** Flip spreads are 4–7% while weekly
   average prices drift 29–115%, so any view that pools a range reports drift as margin.
4. **Profit is stated for a pipeline or the portfolio, never for one item.**
   Arcane Dust "+25,175g", DE Gear "−22,282g" and Netherweave Cloth "−12,599g"
   are three halves of two conversions; 1,095 items were bought and 168 sold.
5. **Count units and gold, never rows.** Forever commodity sales fill
   cheapest-first across sellers and one sale mail can cover several buyers, so
   what a row represents is unknown; a row count would mean different things for
   items and commodities.
6. **Listing attempts have three outcomes.** Row sell-through is 96.2% and flags
   only long-tail noise, while 7,249 Arcane Dust units were canceled against
   27,612 sold. Forever's 2/8/24-hour durations are confirmed; that the deposit
   is forfeited on expiry or cancel is single-source. Either way the expired and
   canceled share is the number worth watching.
7. **A block that cannot be computed says what it needs, in place.** The Forever
   export schema, house attribution, deposit formula and item-string format are
   all unknown today; the arrangement must not depend on how those resolve.

## 2. Page-level controls

These apply to every block and are the only things that change what data a
workspace shows. No block has its own item, range or zone control.

| Control | Bar (`04` §3) | Behaviour |
| --- | --- | --- |
| Market | scope bar | A dataset is edition × region × ruleset, mapped at import; house (All · Alliance · Horde · Blackwater · Unassigned) is a filter inside it, derived from each character's faction and the trader's own Blackwater rules (`03-data-architecture.md` §3). One switcher covers both. |
| Display zone | scope bar | `Local` · `UTC` · any IANA zone. Default `Local`. One setting for the whole page; the switch shows the zone abbreviation. |
| Source | — (a rule, not a control) | Every block counts auction rows only; the dataset status chip says so once. Vendor, trade and COD rows appear only in `fees` and, when a pipeline opts in, in that pipeline's inputs. |
| Workspace | workspace tabs | `Item` · `Pipeline` · `Portfolio` (section 3). |
| Item | context bar | A single combobox showing the selected item. Opens an overlay list; never renders the selection as an extra chip. Details in section 7. |
| Pipeline | context bar | Same combobox pattern; shown in place of Item on the Pipeline workspace. |
| Range | context bar | Presets `This reset week` · `7d` · `30d` · `90d` · `All`, and `Custom` in a popover. |

**Display zone is page-level, not a heatmap toggle.** Today the heatmap has a
Local/UTC switch while the scatter and P&L bucket days in browser-local time, so
two blocks can disagree about which day a sale happened. A Forever market spans
many zones (Oceania trades on the US market; all of Europe shares one), so the
trader's own zone, the market's peak zone and UTC are all legitimate readings.
Requirement on the data layer: every time-keyed aggregate can be re-bucketed for
any IANA zone. The data layer's time atom is the UTC hour, so zones offset by 30
or 45 minutes (Adelaide trades on the US market) are binned by the local time at
the start of each UTC hour; the zone label carries a `≈` in that case.

**Time bucket is derived from the range**, never chosen: up to 6 weeks → day;
up to 1 year → reset week; up to 5 years → calendar month; longer → quarter.
Every time axis therefore stays at about 60 columns or fewer for the first
fifteen years of a dataset.

**The reset week is anchored to a UTC instant, not to the display zone.** Each
dataset stores the instant its week turns over (US Tuesday 15:00 UTC, EU
Wednesday 04:00 UTC; both single-source, both editable). Week buckets, `This
reset week` and the week baselines used for price normalisation are cut at that
instant, so changing the display zone never moves a sale into another week. Day
buckets and heatmap rows are display-zone days; the heatmap's first row is the
weekday that contains the anchor in the display zone.

## 3. Workspaces

A workspace is a fixed arrangement. Changing item, pipeline, range, market or
zone swaps data inside the same boxes. Every workspace starts with six `kpi`
blocks. Diagrams show the wide arrangement; at the medium breakpoint every `S`
and `M` takes a full row.

### Item — "When does this item move, and at what price?"

```
 1    2    3    4    5    6    7    8    9   10   11   12
┌────────┬────────┬────────┬────────┬────────┬────────┐
│  kpi   │  kpi   │  kpi   │  kpi   │  kpi   │  kpi   │
├────────┴────────┴────────┴────────┴────────┴────────┤
│                                                      │
│  XL  timing-heatmap                                  │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  XL  price-timeline                                  │
│                                                      │
├─────────────────┬─────────────────┬──────────────────┤
│  S  post-windows│  S  spread      │  S  outcomes-trend│
└─────────────────┴─────────────────┴──────────────────┘
```

### Pipeline — "Does turning these inputs into those outputs make money?"

```
┌────────┬────────┬────────┬────────┬────────┬────────┐
│  kpi   │  kpi   │  kpi   │  kpi   │  kpi   │  kpi   │
├────────┴────────┴────────┴────────┴────────┴────────┤
│  L   pipeline-balance                                │
├──────────────────────────┬───────────────────────────┤
│  M   cumulative-flow     │  M   outcomes-by-item     │
└──────────────────────────┴───────────────────────────┘
```

### Portfolio — "Which items carry the business, and where does gold leak?"

```
┌────────┬────────┬────────┬────────┬────────┬────────┐
│  kpi   │  kpi   │  kpi   │  kpi   │  kpi   │  kpi   │
├────────┴────────┴────────┴────────┴────────┴────────┤
│                                                      │
│  XL  item-ledger                                     │
│                                                      │
├──────────────────────────┬───────────────────────────┤
│  M   cumulative-flow     │  M   outcomes-by-item     │
├─────────────────┬────────┴────────┬──────────────────┤
│  S  concentration│ S  house-split │  S  fees         │
└─────────────────┴─────────────────┴──────────────────┘
```

`cumulative-flow` and `outcomes-by-item` are the same two blocks in both the
Pipeline and Portfolio workspaces, fed a different subject. Twelve chart and
table blocks plus twelve `kpi` blocks (section 5) cover all three workspaces.

## 4. Catalog

`requires` is all-of; `requiresAny` is at-least-one-of. Chrome is static per
block: **T** toolbar, **R** readout, **F** footer.

| id | Title | Size | Workspace | `requires` | `requiresAny` | T | R | F | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `timing-heatmap` | When your sales cleared | `XL` | Item | `sales` | — | yes | yes | yes | carry over, extended |
| `price-timeline` | Price over time | `XL` | Item | — | `sales`, `purchases` | yes | yes | yes | redesign of scatter; absorbs histogram |
| `post-windows` | Best listing windows | `S` | Item | `sales` | — | yes | yes | no | new |
| `spread` | Buy vs sell spread | `S` | Item | `sales`, `purchases` | — | yes | yes | yes | new; replaces histogram |
| `outcomes-trend` | Listing outcomes | `S` | Item | `sales`, `listingOutcomes` | — | yes | yes | yes | redesign of sell-through |
| `pipeline-balance` | Inputs and outputs | `L` | Pipeline | `pipelines`, `sales`, `purchases` | — | yes | yes | no | new |
| `cumulative-flow` | Spend vs revenue | `M` | Pipeline, Portfolio | `sales`, `purchases` | — | yes | yes | yes | redesign of daily P&L |
| `outcomes-by-item` | Outcomes by item | `M` | Pipeline, Portfolio | `sales`, `listingOutcomes` | — | yes | yes | yes | redesign of sell-through |
| `item-ledger` | Items | `XL` | Portfolio | — | `sales`, `purchases` | yes | yes | yes | new |
| `concentration` | Revenue concentration | `S` | Portfolio | `sales` | — | yes | yes | no | new |
| `house-split` | By auction house | `S` | Portfolio | `sales`, `houseAttribution` | — | no | yes | no | new |
| `fees` | Fees and upkeep | `S` | Portfolio | `ledger` | — | no | yes | no | cash flow, demoted |

Conventions for every spec below:

- **Body budget** at the wide breakpoint, with all chrome present, is 440px for
  `XL` and 244px for `S`, `M` and `L` (`04` §5). Every mark spec is sized to that.
- **Toolbar** is one row. `S` blocks get at most one segmented control with three
  options; `M` and larger at most two controls.
- **Readout** columns are a fixed 128px. Each spec lists its fields in priority
  order within the limit for its size: three for `S`, four for `M`, five for `L`
  and `XL`. Idle text is shown when nothing is selected; the slot is the same
  height either way.
- **Hover, focus and touch are one interaction.** Hovering, focusing with the
  keyboard, or tapping a cell or mark selects it and fills the readout; a tap
  elsewhere in the body clears it.
- **Footer** carries the legend and nothing else.
- **Caveat slot.** Dataset caveats sit in the reserved slot in the block header
  and on the dataset status chip, never in the footer or the idle text. A block
  shows at most one, in this order: attribution coverage (`house-split`), "price
  basis unconfirmed" (any block that shows gold, while `priceBasisConfirmed` is
  false), "commodity rows unverified" (any block on a Forever dataset until the
  adapter's row semantics are confirmed).
- **Empty** means the capability exists but the current subject and range have
  no data. **Unavailable** means a required capability is missing.

### `timing-heatmap` — When your sales cleared

- **Question:** in which hours of which days do units of this item actually sell?
- **Mark:** 7 × 24 cell grid; rows are display-zone days starting with the
  weekday that contains the reset anchor, columns 00–23. A fixed margin on the
  right holds a share-of-week bar per day; a fixed margin underneath holds a
  share bar per hour. The marginals answer "which day" and "which hours" without
  reading 168 cells. Below 640px of plot width the grid keeps 640px and scrolls
  horizontally inside the body.
- **Needs:** per selected item, per weekday-hour cell in the display zone:
  units, net gold, the number of times that weekday-hour occurs in the range,
  the number of those occurrences with at least one sale, and the week-normalised
  price index with its coverage (`03` §6).
- **Toolbar:** `Units · Revenue · Consistency`.
  Consistency colours a cell by occurrences with a sale ÷ occurrences in range.
  A cell that sold on 10 of 11 Tuesdays at 21:00 is demand; one that sold a
  large lot once is an accident. The denominator is per cell because a range
  rarely contains the same number of every weekday-hour. This is the available
  defence against the listing-presence confound.
- **Readout:** `When` Tue 21:00 AEDT · `Units` · `Revenue` · `Seen` 9 of 15 ·
  `Price vs week` +2.1%. Price vs week needs `weekBaseline` and sales in at
  least three occurrences, otherwise `—`. The raw median price per cell is removed.
- **Idle:** "Select a cell. Sale times may trail the sale by up to an hour."
- **Footer:** colour ramp with its maximum as a number; "no sales" swatch.
- **Empty:** "No sales of {item} in this range."
- **Status:** carry over. Changes: the zone switch moves to the scope bar; rows
  follow the reset anchor; marginals and Consistency are added; the price
  readout is week-normalised.
- **Title is deliberate.** It says "your sales", not "demand". The export cannot
  tell "nobody buys at 10:00" from "you were sold out at 10:00".
- **With `marketContext.hourly`** (house snapshots at roughly hourly cadence): a
  fourth mode, `Market`, shows market-wide units cleared per slot, and `Your
  share` replaces `Seen` in the readout. At that point the confound is resolved
  by comparison; nothing in the block's geometry changes because the control
  gains one option within the same row. Hourly snapshots exist only behind
  Blizzard's API, which needs a server-side secret, so this mode is outside a
  client-only app and is not planned (`03-data-architecture.md` §4).

### `price-timeline` — Price over time

- **Question:** what did I pay and what did I get, and how did both move?
- **Mark:** one column per time bucket. Buys sit in the left half of the column
  as filled circles, sells in the right half as rings. One mark per
  (bucket, side, display price bin), drawn at that bin's unit-weighted mean
  price, area ∝ units on a square-root scale from 2.5px up to
  min(14px, half the side's column width), scaled to the largest visible mark.
  A thin line joins each side's median per bucket. At most 24 display bins:
  18px per bin in the 440px body. Below 640px of plot width the plot keeps
  640px and scrolls horizontally inside the body.
- **Why `XL`, and why 24 bins.** In a 244px `L` body, 48 bins would be 4.5px
  each, less than the smallest mark, and buys and sells could not stay on their
  own sides of a column.
- **Why aggregated marks.** The Python reference draws one bubble per row and
  jitters them. That assumes a row is a stack of at most a few dozen units;
  Forever commodity rows are of unknown shape and the market is region-wide.
  Binning first makes the mark count a function of the axes (≤ 60 buckets × 24
  bins × 2), independent of row count, and keeps the buy-left/sell-right
  reading. Each bucket's column of bins is a mirrored histogram, so the price
  distribution survives here with its time axis attached.
- **Needs:** per item, side and time bucket, the fine price cube: units per
  0.5% geometric price step, keyed on the UTC hour. At query time the steps
  inside the chosen price window are merged into at most 24 display bins, each
  returned with its units and unit-weighted mean price. Per item, side and
  bucket: the median price, exact to ±0.25%. Event markers (date, label) from
  the edition profile.
- **Toolbar:** price window `Fit · Middle 90% · Full`. Changing the window
  re-merges the fine steps, so a narrower window shows finer bins. The
  "6.0–7.0g" and "4.5–8.0g" presets and drag-to-zoom belong to the older
  `ah-heatmap` scatter and were never in wowahdata's `ScatterChart`; the three
  windows replace both and drag-to-zoom is not added.
- **Markers:** vertical rules for profile events inside the range — launch
  (4 Nov 2026) and raid unlock (9 Dec 2026). Until raids open there is no
  reset-day demand cycle to see; the marker tells the reader why the pattern
  changes afterwards.
- **Readout:** `Bucket` Tue 17 Nov · `Side` Sold · `Price` 6g 52s · `Units` 340 ·
  `Share of bucket` 18%.
- **Idle:** "Select a mark. Prices are per unit."
- **Footer:** filled = bought, ring = sold, line = median; three reference sizes.
- **Empty:** "No AH buys or sells of {item} in this range."
- **With `marketContext.daily`:** a dashed market-value line; no other change.
- **Status:** redesign.

### `post-windows` — Best listing windows

- **Question:** if I post for 2, 8 or 24 hours, when should the clock start?
- **Mark:** a three-row table, one row per listing duration (2h, 8h, 24h —
  confirmed by client strings). Columns: best start (weekday and hour, display
  zone), share of the week's units inside that window, and a bar for the share.
- **Needs:** the heatmap's 168-cell units vector.
- **Toolbar:** `Best of week · Best per day`. The second option keeps three rows
  and shows the best daily start hour with its share of a day's units.
- **Readout:** `Starts` Tue 19:00 AEDT · `Share` 31% · `Units` 1,602.
- **Idle:** "Share of your weekly units that sold inside each window."
- **Empty:** "No sales of {item} in this range."
- **Status:** new. It turns the hero into a decision using the one Forever
  listing fact that is confirmed. In the sample, the best 6 hours of the day
  hold 56% of Greater Planar Essence units.

### `spread` — Buy vs sell spread

- **Question:** within the same day or week, how far apart were my buy and sell
  prices?
- **Mark:** one dumbbell per time bucket: filled dot at the median buy, ring at
  the median sell, joined by a line. Buckets with only one side show the single
  mark. The bucket is the page's (day up to six weeks, then reset week, month,
  quarter), the same as every other block.
- **Needs:** per item, time bucket: median buy price, median sell price, units
  on each side. Medians come from the fine price cube that `price-timeline`
  uses, exact to ±0.25%, with no row access.
- **Toolbar:** `Price · Percent`.
- **Readout:** `Bucket` Tue 17 Nov · `Buy → sell` 6.15 → 6.57 g · `Spread` +6.8%.
  The pair is written in the axis unit so it fits one column.
- **Idle:** "Each bar joins one bucket's median buy and median sell."
- **Footer:** filled = bought, ring = sold.
- **Empty:** "{item} needs both buys and sells in the same bucket to show a spread."
- **Status:** new; the standalone histogram is dropped. 35% of Arcane Dust buy
  units sit above the whole-range median sell price, which the histogram shows
  as bad buying and this block shows as drift.

### `outcomes-trend` — Listing outcomes

- **Question:** of the units I listed, how many sold, expired, or did I pull?
- **Mark:** one stacked bar per time bucket, by units, always in the order
  sold, canceled, expired.
- **Needs:** per item, time bucket: sold units, expired units, canceled units.
- **Toolbar:** `Units · Share`.
- **Readout:** `Bucket` Wk of 17 Nov · `Success` 79% of 518 · `Canc. / exp.` 96 / 12.
- **Idle:** "Units per listing attempt. Relisted stock is counted each time."
- **Footer:** sold, canceled, expired swatches.
- **Empty:** "No listing activity for {item} in this range."
- **Unavailable:** "Needs the expired and canceled files from the export."
- **Status:** redesign. Units replace rows; canceled joins the denominator; the
  red "slow" flag is removed because it fires only on items with a handful of
  lifetime events.

### `pipeline-balance` — Inputs and outputs

- **Question:** what went into this conversion, what came out, and what is left?
- **Mark:** two ranked bar lists sharing a gold axis: what member items cost
  growing left from a centre gutter, what they earned growing right. Each side
  ranks every member, so an output that was also bought on the AH appears on
  the left as well. Six rows per side plus an "Other member items" row, always
  seven 32px rows under a 24px heading row ("Bought" / "Sold"). The gutter shows
  the pipeline margin, sold − bought over all members, uncoloured and captioned
  "stock on hand is not counted".
- **Needs:** per pipeline: for each member item, side, units, gold, average unit
  price; totals per side. Pipeline definitions (below).
- **Toolbar:** `Gold · Units`; an `Edit pipeline` button that opens an overlay.
- **Readout:** `Item` · `Side` Bought · `Gold` · `Units` · `Share of side` 61%.
- **Idle:** "The export does not link a purchase to what it became; membership
  is yours to edit."
- **Empty:** "No activity for this pipeline in this range."
- **Unavailable:** "Needs both the purchases and sales files."
- **Status:** new. This is the built-out form of the "DE source" card.

**Pipelines.** A pipeline is a named pair of item sets, stored as
`03-data-architecture.md` §8 defines: each member carries a `share` of that
item's cost or revenue, shares for one item sum to at most 1 across pipelines,
and whatever is left is reported as "unassigned" so pipelines plus unassigned
always equal the portfolio. The export records no conversions, so membership is
a user-owned definition with generated defaults:

- An item's *role* is computed once, over the dataset's whole history, to
  generate the defaults, and is then stored with the pipeline it produced; it
  does not change with the selected range. It is `input` when sold units are
  under 10% of bought units, `output` when at least half its sold units were
  not bought on the AH (sold − bought ≥ half of sold; expired units are not
  added, see section 5), otherwise `flip`.
- On first load one generated pipeline, "All conversions", holds every input
  and output at share 1, so the workspace is useful with no setup. The trader
  splits it (for the sample: gear → dust, essences, shards; cloth → bolts and
  bags).
- Each `flip` item is its own one-item pipeline, on both sides.
- Membership rules may be item keys or item-string patterns. The random-enchant
  gear bucket is a pattern rule, because Forever's suffix format is unknown.

### `cumulative-flow` — Spend vs revenue

- **Question:** is revenue keeping ahead of spend, and when was I building stock?
- **Mark:** two cumulative lines over the time buckets, spend and revenue, with
  the gap shaded. No per-day bars.
- **Needs:** per subject (pipeline or portfolio), time bucket: spend, revenue.
- **Toolbar:** `Cumulative · Per bucket`.
- **Readout:** `Through` 17 Nov · `Spend` · `Revenue` · `Gap` +1,240g.
- **Idle:** "Unsold stock is not counted, so a negative gap can be inventory,
  not loss."
- **Footer:** spend line, revenue line.
- **Empty:** "No AH buys or sells in this range."
- **Status:** redesign of daily P&L. All-items daily P&L was positive on 45 days
  and negative on 51 — buy days and sell days. The cumulative line was the
  useful half, so it is the default.

### `outcomes-by-item` — Outcomes by item

- **Question:** which of the items that matter have a churn or expiry problem?
- **Mark:** eight horizontal stacked bars, 24px each, in the order sold,
  canceled, expired, for the top eight items of the subject. No axis in either
  mode: bar length is share of the row in `Share`, and scaled to the largest
  row in `Units`; exact values are in the readout. Items beyond eight are in
  `item-ledger`.
- **Needs:** per item of the subject: sold, expired, canceled units; revenue
  for ranking.
- **Toolbar:** `Share · Units`; sort `Revenue · Canceled · Expired`.
- **Readout:** `Item` · `Success` 59% · `Sold` 27,612 · `Canc. / exp.` 7,249 / 11,980.
- **Idle:** "Ranked by revenue, so the long tail stays out of the way."
- **Footer:** sold, canceled, expired swatches.
- **Unavailable:** as `outcomes-trend`.
- **Status:** redesign. Ranking by revenue is the fix: the sample's churn is in
  Arcane Dust and Greater Planar Essence, which the old threshold never flagged.

### `item-ledger` — Items

- **Question:** which items carry the business, and what is each one's role?
- **Mark:** a virtualised table with a sticky 32px header and fixed 32px rows,
  about twelve visible in the 440px body, sorted by revenue. Columns: item, kind
  (commodity or item, when known), role, pipeline, sold units, revenue, share
  of revenue, bought units, spend, listing success. Clicking a row selects the
  item; a row action opens it in the Item workspace. An `L` would show seven
  rows of a catalogue of 1,224.
- **Needs:** per item in range: the totals above, stored role, pipeline, kind.
- **Toolbar:** role filter `All · Outputs · Inputs · Flips`; a text filter field.
- **Readout:** `Item` · `Avg sell` · `Avg buy` · `First seen` · `Last seen`.
- **Idle:** "Select a row for its prices and dates."
- **Footer:** "{n} items · {k} carry 80% of revenue".
- **Empty:** "No AH activity in this range."
- **Status:** new. It is the browsing surface for a catalogue that only grows.
- **With `marketContext.daily`:** one more column, average sell vs market value.
  The table scrolls horizontally inside the body if it does not fit.

### `concentration` — Revenue concentration

- **Question:** how few items is this business really about?
- **Mark:** a cumulative-share curve over items ranked by revenue, with the 80%
  crossing marked.
- **Needs:** ranked revenue per item in range; ranked spend when `purchases`
  is present.
- **Toolbar:** `Revenue · Spend`. `Spend` is disabled without `purchases`.
- **Readout:** `Rank` 4 · `Item` · `Cumulative` 82%.
- **Idle:** "{k} of {n} sold items make 80% of revenue."
- **Status:** new. Sample: 4 of 168 sold items are 82% of revenue; the spend
  side is the opposite shape (1,095 items), which the toggle shows.

### `house-split` — By auction house

- **Question:** how much went through each house, and what did the neutral
  house's higher cut cost?
- **Mark:** four fixed rows — Alliance, Horde, Blackwater, Unassigned — each
  with revenue and estimated cut paid. A faction row is labelled "(assumed)"
  unless every sale in it is confirmed. Assumed and unassigned rows show the
  cut as a low–high range across the dataset's cut rates.
- **Needs:** revenue and units per house, split into confirmed and assumed;
  cut rate per house from the dataset settings.
- **Why "assumed".** A character's faction does not say which house a sale used:
  any character can also sell through Blackwater, and no row reveals it. The
  data layer therefore tags each event's house as *confirmed* — the character
  is set to "uses Blackwater: never", or one of the trader's rules matches — or
  *assumed*, meaning a "sometimes" character's sale left on its faction house by
  default. Blackwater revenue exists only where a rule put it there.
- **Caveat slot:** "{coverage}% confirmed", counting confirmed revenue only.
- **Readout:** `House` Horde (assumed) · `Revenue` · `Cut rate` 5%.
- **Idle:** "Assumed rows follow each character's faction and may include
  Blackwater sales."
- **Unavailable:** "Set each character's faction and whether it uses Blackwater
  in dataset settings."
- **Status:** new. The 5% and 15% cuts are single-source figures, so they are
  dataset settings and never constants in a block.

### `fees` — Fees and upkeep

- **Question:** what did trading cost besides the goods?
- **Mark:** a short ranked list of ledger categories with a total, plus the
  estimated AH cut as its own line, a low–high range where the house is not
  confirmed. Below the total, two lines that are not in it: "Between your own
  characters" (the counterparty is one of the dataset's characters) and "Other
  transfers".
- **Needs:** ledger totals by type in range, with each transfer flagged at
  import as own-character or other; estimated cut from the fee model.
- **Readout:** `Type` · `Total` · `Share of revenue` 0.04%.
- **Idle:** "Transfers are listed but not counted as fees."
- **Unavailable:** "Needs the income and expenses files."
- **Status:** cash flow, demoted from a tab to an `S` block. Sample: postage
  6.9g and repairs 33.1g against 103,339g revenue. Of the 4,162g sent as
  transfers, 2,311g went to a name that is not one of the trader's characters,
  so "money transfer" cannot be assumed to be internal. If the Forever export
  records deposits, forfeited deposits become a line here.

## 5. KPI blocks

Each workspace lists six `kpi` blocks, always in these positions. A `kpi` block
has a label, a value and a sub-line; with nothing to show it prints `—` and a
one-line reason in the sub-line. It never disappears.

| # | Item | Pipeline | Portfolio |
| --- | --- | --- | --- |
| 1 | `kpi-revenue` | `kpi-revenue` | `kpi-revenue` |
| 2 | `kpi-spend` | `kpi-spend` | `kpi-spend` |
| 3 | `kpi-flip-margin` | `kpi-pipeline-margin` | `kpi-net-flow` |
| 4 | `kpi-off-ah-supply` | `kpi-margin-pct` | `kpi-concentration` |
| 5 | `kpi-listing-success` | `kpi-listing-success` | `kpi-listing-success` |
| 6 | `kpi-peak-window` | `kpi-top-output` | `kpi-fees` |

Twelve definitions fill the eighteen positions. A shared block takes the
workspace's subject: the item, every member of the pipeline, or the portfolio.

| id | Label | Value · sub-line | `requires` | Sub-line when unavailable |
| --- | --- | --- | --- | --- |
| `kpi-revenue` | Revenue | gold · units, avg per unit | `sales` | needs the sales file |
| `kpi-spend` | Spend | gold · units, avg per unit | `purchases` | needs the purchases file |
| `kpi-flip-margin` | Flip margin | signed gold, coloured · matched units, spread % | `sales`, `purchases` | needs sales and purchases |
| `kpi-off-ah-supply` | Off-AH supply | units · share of units sold | `sales`, `purchases` | needs sales and purchases |
| `kpi-listing-success` | Listing success | percent · canceled and expired units | `sales`, `listingOutcomes` | needs expired and canceled files |
| `kpi-peak-window` | Peak 8 hours | share of units · window start, zone | `sales` | needs the sales file |
| `kpi-pipeline-margin` | Pipeline margin | signed gold, uncoloured · "stock not counted" | `pipelines`, `sales`, `purchases` | needs sales and purchases |
| `kpi-margin-pct` | Margin % | margin ÷ spend · "of spend" | `pipelines`, `sales`, `purchases` | needs sales and purchases |
| `kpi-top-output` | Top output | item name · share of pipeline revenue | `pipelines`, `sales` | needs the sales file |
| `kpi-net-flow` | Net gold flow | signed gold, uncoloured · "stock not counted" | `sales`, `purchases` | needs sales and purchases |
| `kpi-concentration` | 80% of revenue | item count · "of {n} sold items" | `sales` | needs the sales file |
| `kpi-fees` | Fees and upkeep | gold · share of revenue | `ledger` | needs income and expenses files |

- **Flip margin** replaces per-item Net P&L: matched units (the smaller of
  bought and sold) × (average sell − average buy). For Greater Planar Essence
  that is 1,204 units × 0.38g ≈ 455g, against the roughly +26,300g the current
  card shows. With the files present but no AH buys of the item it reads `—` ·
  "not bought on the AH — see pipeline".
- **Off-AH supply** replaces "DE source": units sold minus units bought, floored
  at zero, as a count and a share of units sold. Expired units are no longer
  added. The current formula gives 34,325 for Arcane Dust, more than the 27,612
  units sold, because expired stock is relisted and counted again; the
  replacement gives 22,345 (81%). The name drops "DE" because the same number
  describes tailoring, smelting and farming.
- **Listing success** = sold ÷ (sold + expired + canceled), by units.
- **Peak 8 hours** = share of units sold in the best contiguous eight hours of
  the day, with the window in the display zone. Eight hours matches the middle
  listing duration.
- **Net gold flow** is never coloured as profit or loss. The sample portfolio is
  −11,899g over the range with stock on hand that the export cannot see.
- **Pipeline margin** is sold − bought over every member item, on both sides.
  It is not coloured either, for the same reason: the sample's generated "All
  conversions" pipeline reads −9,691g with unsold stock the export cannot see.
- Only **Flip margin** carries profit/loss colour, because it is computed on
  matched units and so does not depend on stock.

## 6. Encoding rules

**Colour.** Tokens come from `app/globals.css`; no block defines its own.

| Role | Value | Contrast on `--surface` | Second cue |
| --- | --- | ---: | --- |
| Buy | `--buy` rgb(29,158,117) | 4.5:1 | filled mark, left half of column |
| Sell | new `--sell-mark` #a9a2f2 | 6.7:1 | ring mark, right half of column |
| Profit | `--profit` #5dcaa5 | 7.6:1 | leading `+` |
| Loss | `--loss` #e24b4a | 3.9:1 | leading `−` |
| Sold | `--profit` | 7.6:1 | solid fill, first in the stack |
| Canceled | `--loss` | 3.9:1 | diagonal stripe, middle of the stack |
| Expired | `--text-secondary` outline | 5.4:1 | outline only, last in the stack |

- The existing `--sell` rgb(83,74,183) is 2.2:1 on the card surface, below the
  3:1 needed for a graphic. It stays for tinted backgrounds; marks and lines use
  `--sell-mark`, which is the same hue and clearly lighter than `--buy`
  (relative luminance 0.41 against 0.26).
- Buy and sell are never distinguished by colour alone: fill versus ring, and
  left versus right.
- The heatmap keeps the viridis ramp in `components/heatmap/colorScale.ts`.
  A cell with no sales is the surface colour, not the bottom of the ramp.
- Colour appears on a number only as profit or loss, and only with its sign.
  The outcome trio (sold, canceled, expired) is a separate categorical set used
  only for bar segments and their legend; it borrows two of the same tokens, so
  it also differs by pattern and by fixed position in the stack.

**Money.** Forever keeps copper precision and launch-era prices are small
(Mageweave was reported at 8s in launch week), so a fixed two-decimal gold
format hides the whole price.

| Value | Format | Example |
| --- | --- | --- |
| Unit price under 1s | copper | `47c` |
| Unit price under 1g | silver and copper | `8s 40c` |
| Unit price under 100g | gold and silver | `6g 52s` |
| Unit price 100g and over | whole gold | `1,234g` |
| Totals 10,000g and over | thousands | `33.7k g` |
| Axis ticks | decimal in g, s or c, whichever keeps ticks between 1 and 1,000; unit named in the axis title | `6.50` · `8.4` · `47` |

- The current `33.7kg` suffix reads as kilograms; it becomes `33.7k g`.
- Unit prices are labelled "per unit" and shown as recorded. No block
  reconstructs the buyer's gross price; only `house-split` and `fees` estimate
  the cut, and only their bodies show a low–high range.
- Whether a Forever sale row is recorded net of the cut is unknown. The dataset
  setting defaults to net (what TSM records on Classic), and until the trader
  confirms it "price basis unconfirmed" shows on the dataset status chip and in
  the caveat slot of every block that shows gold.
- All numerals are tabular. Units are integers with separators.

**Time.**

- The display-zone abbreviation appears on the scope bar's zone switch and in
  every `When`, `Starts` or window value in a readout or KPI sub-line. Block
  titles and subtitles do not repeat it.
- Hours are `00`–`23`. Dates are `Tue 17 Nov`. Week buckets are labelled by the
  display-zone date of their reset anchor: `Wk of 17 Nov`.
- Storage and URLs are UTC; only display is zoned.

## 7. Finding items at scale

The current chip row grows when a searched item is appended (+36px for
everything below it). It is replaced by three things, none of which can wrap:

1. **Combobox.** One fixed-width field showing the selected item. Its overlay
   list has three sections: Pinned, Top by revenue in range (with share), and
   All (search, ranked by revenue then activity). Each entry shows role and,
   when known, commodity or item. Arrow keys step through the ranked list
   without opening it.
2. **Quick row.** At most five fixed-width slots beside the combobox: pinned
   items first, then top-by-revenue to fill. Labels truncate. Selecting an item
   outside the five changes the combobox only; a sixth slot never appears. Five
   is enough: the top four items are 82% of sample revenue and the top eight 90%.
   When the bar is too narrow the layout's `OverflowRow` drops slots from the
   end; the combobox always remains.
3. **`item-ledger`.** The browsing surface, for when the question is "what
   should I be looking at".

Pins are stored per dataset. Item groups (random-enchant gear, and any group the
trader defines by pattern) appear in all three as single entries.

## 8. Not built

| Not built | Why |
| --- | --- |
| Counterparty views | 5,819 distinct buyers; the top ten are 4% of revenue. |
| Per-character splits | One character is 98% of sale rows. |
| Standalone price histogram | Pools a range in which prices drift 29–115%; replaced by `spread` and the binned columns of `price-timeline`. |
| Per-item Net P&L, per-item daily P&L bars | +25,175g / −22,282g / −12,599g for three legs of two conversions. |
| Price colour mode on the heatmap | A few percent at most after week-normalising (about +1% for Large Prismatic Shard), beside a 3.5–8× volume swing. |
| "Slow mover" flag | Fires only on items with a handful of lifetime events. |
| Cash-flow tab | 40g of fees against 103,339g of revenue. |
| All-items timing heatmap | Less concentrated than any single top item (28% in the top tenth of cells against 34–56% for the four largest items) and item signatures differ by weekday. |
| Cross-ruleset or cross-faction comparison | Each ruleset × faction is a separate market; TSM removed its own merged view in 4.15.8. |
| Black Market and token tracking | Players cannot list on the Black Market; neither appears in an Accounting export. |

## 9. Phasing

**Phase 1 — a Forever Accounting export, schema unknown.** Everything here
needs purchases, sales, expired and canceled rows with an item, a quantity, a
unit price and a time, mapped at import:

the twelve `kpi` blocks, `timing-heatmap`, `price-timeline`, `post-windows`,
`spread`, `outcomes-trend`, `outcomes-by-item`, `cumulative-flow`,
`pipeline-balance` (with the generated "All conversions" pipeline),
`item-ledger`, `concentration`, `fees` (if ledger files exist), and
`house-split` with its faction rows marked assumed.

Phase 1 survives most of the open unknowns because it counts units and gold,
bins prices, takes the reset anchor and cut from settings, and treats item
grouping as pattern rules. It still assumes two columns beyond those four: a
`source` column, to keep auction rows apart from vendor, trade and COD, and a
`player` column, for the character → faction mapping. If the Forever export
lacks `source`, every row is treated as auction and the status chip says so; if
it lacks `player`, `house-split` is unavailable.

**Waiting on a specific unknown** (named as in `02-forever-facts.md`):

| Feature | Waits on |
| --- | --- |
| Confirmed rows in `house-split` without hand-written rules | Whether the export attributes a sale to a house. Until then faction rows are assumed and Blackwater exists only by rule. |
| A single cut figure, and gross prices | The same, plus whether recorded sale prices are net or gross of the cut. |
| Forfeited deposits in `fees` and as a KPI | The deposit formula and minimum, and whether the export records deposits. |
| Commodity / item tag in ledger and combobox | Commodity row semantics and a reliable per-item kind; the commodity list is single-source. |
| Default random-enchant group for Forever | The Forever item-string format. |
| Correct default reset anchor per region | A published reset day and hour. Editable from day one. |
| Sale-time correction on the heatmap | Whether TSM's Forever timestamps are mail time or sale time. |
| Raid-reset reading of the heatmap | Raids opening on 9 Dec 2026, then several weeks of data. |

**Phase 2 — `marketContext`.** Market-value line on `price-timeline`, a market
column in `item-ledger`, both from a daily TSM public-data file the trader drops
in or opts in to fetch. This is the only phase that can fetch anything from
outside the browser; the rules that keep it compatible with "your trading data
never leaves your browser" are in `03-data-architecture.md` §4. The heatmap's
`Market` mode needs hourly snapshots and therefore a server; it is not planned.
