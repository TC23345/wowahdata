# Block catalog

What the Forever edition shows, in which fixed arrangement, and why. Evidence
figures are from `01-evaluation.md` (the Nightslayer sample); Forever facts and
their confidence tags are from the research brief. Sizes (`kpi`, `S`, `M`, `L`,
`XL`), the toolbar row and the readout slot are defined in `04-layout-system.md`;
capabilities and aggregates are produced as described in `03-data-architecture.md`.

## 1. Principles

1. **Timing is the hero.** The best 6-hour window holds 49–56% of units for the
   top three items against 7–11% for the worst; nothing else in the data swings 4–8×.
2. **The clock explains volume, not price.** A 12.7% raw time-of-day price gap on
   Large Prismatic Shard is −0.7% once each sale is divided by its week's average;
   no block may colour or rank by an un-normalised price per time slot.
3. **Price is always drawn against time.** Flip spreads are 4–7% while weekly
   average prices drift 21–101%, so any view that pools a range reports drift as margin.
4. **Profit is stated for a pipeline or the portfolio, never for one item.**
   Arcane Dust "+25,175g", DE Gear "−22,282g" and Netherweave Cloth "−12,599g"
   are three halves of two conversions; 1,095 items were bought and 168 sold.
5. **Count units and gold, never rows.** Forever commodity sales fill
   cheapest-first across sellers and one sale mail can cover several buyers, so
   what a row represents is unknown; a row count would mean different things for
   items and commodities.
6. **Listing attempts have three outcomes.** Row sell-through is 96.2% and flags
   only long-tail noise, while 7,249 Arcane Dust units were canceled against
   27,612 sold; Forever's 2/8/24-hour durations and forfeited deposits make the
   expired and canceled share the number worth watching.
7. **A block that cannot be computed says what it needs, in place.** The Forever
   export schema, house attribution, deposit formula and item-string format are
   all unknown today; the arrangement must not depend on how those resolve.

## 2. Page-level controls

These live in the control bar, apply to every block, and are the only things
that change what data a workspace shows. No block has its own item, range or
zone control.

| Control | Behaviour |
| --- | --- |
| Market | A dataset is edition × region × ruleset, mapped at import; house (All · Alliance · Horde · Blackwater · Unassigned) is a filter inside it, derived from each character's faction and the trader's own Blackwater rules (`03-data-architecture.md` §3). One switcher covers both. |
| Source | Every block counts auction rows only, and says so in its idle text. Vendor, trade and COD rows appear only in `fees` and, when a pipeline opts in, in that pipeline's inputs. |
| Workspace | `Item` · `Pipeline` · `Portfolio` (section 3). |
| Item | A single combobox showing the selected item. Opens an overlay list; never renders the selection as an extra chip. Details in section 7. |
| Pipeline | Same combobox pattern; visible in place of Item on the Pipeline workspace. |
| Range | Presets `This reset week` · `7d` · `30d` · `90d` · `All`, and `Custom` in a popover. |
| Display zone | `Local` · `UTC` · any IANA zone. Default `Local`. One setting for the whole page. |

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
up to 1 year → reset week; longer → calendar month. This caps every time axis at
roughly 60 columns however long the game runs.

**Reset week** starts on the day the edition profile gives for the region (US
Tuesday; EU Wednesday is inferred) and is a per-dataset setting. The heatmap's
first row and every "week" bucket follow it.

## 3. Workspaces

A workspace is a fixed arrangement. Changing item, pipeline, range, scope or
zone swaps data inside the same boxes. Every workspace starts with the same
six-slot KPI strip geometry.

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
│  L   price-timeline                                  │
├─────────────────┬─────────────────┬──────────────────┤
│  S  post-windows│  S  spread-weeks│  S  outcomes-trend│
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
│  L   item-ledger                                     │
├──────────────────────────┬───────────────────────────┤
│  M   cumulative-flow     │  M   outcomes-by-item     │
├─────────────────┬────────┴────────┬──────────────────┤
│  S  concentration│ S  house-split │  S  fees         │
└─────────────────┴─────────────────┴──────────────────┘
```

`cumulative-flow` and `outcomes-by-item` are the same two blocks in both the
Pipeline and Portfolio workspaces, fed a different scope. Twelve block types
plus the KPI strip cover all three workspaces.

## 4. Catalog

| id | Title | Size | Workspace | Capability | Status |
| --- | --- | --- | --- | --- | --- |
| `kpi-strip` | — | 6 × `kpi` | all | `sales` | redesign |
| `timing-heatmap` | When your sales cleared | `XL` | Item | `sales` | carry over, extended |
| `price-timeline` | Price over time | `L` | Item | `sales` or `purchases` | redesign of scatter; absorbs histogram |
| `post-windows` | Best listing windows | `S` | Item | `sales` | new |
| `spread-weeks` | Buy vs sell by week | `S` | Item | `sales` + `purchases` | new; replaces histogram |
| `outcomes-trend` | Listing outcomes | `S` | Item | `listingOutcomes` | redesign of sell-through |
| `pipeline-balance` | Inputs and outputs | `L` | Pipeline | `pipelines` | new |
| `cumulative-flow` | Spend vs revenue | `M` | Pipeline, Portfolio | `sales` + `purchases` | redesign of daily P&L |
| `outcomes-by-item` | Outcomes by item | `M` | Pipeline, Portfolio | `listingOutcomes` | redesign of sell-through |
| `item-ledger` | Items | `L` | Portfolio | `sales` or `purchases` | new |
| `concentration` | Revenue concentration | `S` | Portfolio | `sales` | new |
| `house-split` | By auction house | `S` | Portfolio | `houseAttribution` | new; needs the character → faction mapping |
| `fees` | Fees and upkeep | `S` | Portfolio | `ledger` | cash flow, demoted |

Conventions for every spec below:

- **Toolbar** is one row. `S` blocks get at most one segmented control with three
  options; `M` and larger at most two segmented controls.
- **Readout** is at most five label/value pairs on one line. Idle text is shown
  when nothing is hovered or focused; the slot is the same height either way.
- **Empty** means the capability exists but the current item and range have no
  data. **Unavailable** means the capability is missing for this dataset.

### `timing-heatmap` — When your sales cleared

- **Question:** in which hours of which days do units of this item actually sell?
- **Mark:** 7 × 24 cell grid, rows from the reset day, columns 00–23 in the
  display zone. A fixed margin on the right holds a share-of-week bar per day; a
  fixed margin underneath holds a share-of-day-total bar per hour. The marginals
  answer "which day" and "which hours" without reading 168 cells.
- **Needs:** per selected item, per week slot (168, in display zone): units, net
  gold, sale records, number of distinct reset weeks with a sale, and
  Σ(units × price ÷ that week's average price). Plus number of reset weeks in range.
- **Toolbar:** `Units · Revenue · Consistency`.
  Consistency colours a cell by the share of weeks in range in which it had any
  sale. A cell that sold in 10 of 11 weeks is demand; one that sold a large lot
  in 1 of 11 is an accident. This is the available defence against the
  listing-presence confound.
- **Readout:** `When` Tue 21:00–21:59 AEDT · `Units` · `Revenue` · `Weeks` 9 of 15
  · `Price vs week` +2.1%. Price vs week is shown only for cells with sales in at
  least three weeks, otherwise `—`. The raw median price per cell is removed.
- **Idle:** "Hover a cell. Times in {zone}; sale times come from sale mail and
  can trail the sale by up to an hour."
- **Empty:** "No sales of {item} in this range."
- **Status:** carry over. Changes: zone moves to the page; rows follow the reset
  day; marginals and Consistency are added; price readout is week-normalised.
- **Title is deliberate.** It says "your sales", not "demand". The export cannot
  tell "nobody buys at 10:00" from "you were sold out at 10:00".
- **With `marketContext.hourly`** (house snapshots at roughly hourly cadence): a
  fourth mode, `Market`, shows market-wide units cleared per slot, and the
  readout gains `Your share`. At that point the confound is resolved by
  comparison; nothing in the block's geometry changes because the control gains
  one option within the same row. Hourly snapshots exist only behind Blizzard's
  API, which needs a server-side secret, so this mode is outside a client-only
  app and is not planned (`03-data-architecture.md` §4).

### `price-timeline` — Price over time

- **Question:** what did I pay and what did I get, and how did both move?
- **Mark:** one column per time bucket. Buys sit in the left half of the column
  as filled circles, sells in the right half as rings. One mark per
  (bucket, side, price bin), area ∝ units on a square-root scale between the
  reference script's 2.5px and 14px radii, scaled to the largest visible mark.
  A thin line joins each side's unit-weighted median per bucket.
- **Why aggregated marks.** The reference draws one bubble per row and jitters
  them. That assumes a row is a stack of at most a few dozen units; Forever
  commodity rows are of unknown shape and the market is region-wide. Binning
  first makes the mark count a function of the axes (≤ 60 buckets × 48 bins × 2),
  independent of row count, and keeps the buy-left/sell-right reading. The
  per-bucket column of bins is a mirrored histogram, so the price distribution
  survives here with its time axis attached.
- **Needs:** per item, side, time bucket, price bin: units. Per item, side, time
  bucket: unit-weighted median price. Price bins are a 1–2–5 step in copper
  chosen so the visible range has at most 48 bins. Event markers (date, label)
  from the edition profile.
- **Toolbar:** `Fit · Middle 90% · Full` price range (replaces the hard-coded
  "6.0–7.0g" and "4.5–8.0g" presets, which only suit one item). Drag-to-zoom and
  double-click reset are kept.
- **Markers:** vertical rules for profile events inside the range — launch
  (4 Nov 2026) and raid unlock (9 Dec 2026). Until raids open there is no
  reset-day demand cycle to see; the marker tells the reader why the pattern
  changes afterwards.
- **Readout:** `Bucket` Tue 17 Nov · `Side` Sell · `Price` 6g 52s · `Units` 340 ·
  `Share of bucket` 18%.
- **Idle:** "Filled = bought, ring = sold. Prices are per unit, net to you."
- **Empty:** "No AH buys or sells of {item} in this range."
- **With `marketContext.daily`:** a dashed market-value line; no other change.
- **Status:** redesign.

### `post-windows` — Best listing windows

- **Question:** if I post for 2, 8 or 24 hours, when should the clock start?
- **Mark:** a three-row table, one row per listing duration (2h, 8h, 24h —
  confirmed by client strings). Columns: best start (day and hour, display
  zone), share of the week's units inside that window, and a bar for the share.
- **Needs:** the same 168-slot units vector as the heatmap.
- **Toolbar:** `Best of week · Best per day`. The second option keeps three rows
  and shows the best daily start hour with its share of that day.
- **Readout:** `Window` Tue 19:00 → Wed 03:00 · `Units` · `Share of week` 31% ·
  `Weeks seen` 12 of 15.
- **Idle:** "Share of your weekly units that sold inside each window."
- **Empty:** "No sales of {item} in this range."
- **Status:** new. It turns the hero into a decision using the one Forever
  listing fact that is confirmed. In the sample, the best 6 hours of the day
  hold 56% of Greater Planar Essence units.

### `spread-weeks` — Buy vs sell by week

- **Question:** within the same week, how far apart were my buy and sell prices?
- **Mark:** one dumbbell per bucket: filled dot at the unit-weighted median buy,
  ring at the median sell, joined by a line. Buckets with only one side show the
  single dot.
- **Needs:** per item, time bucket: median buy price, median sell price, units
  on each side. Medians are read from the same binned price grid that
  `price-timeline` uses, so they are exact to one price bin and need no row
  access.
- **Toolbar:** `Gold · Percent`.
- **Readout:** `Week` of 17 Nov · `Buy` 6g 15s · `Sell` 6g 57s · `Spread` +6.8% ·
  `Units` 120 / 410.
- **Idle:** "Each bar is one week's median buy to median sell."
- **Empty:** "{item} needs both buys and sells in the same week to show a spread."
- **Status:** new; the standalone histogram is dropped. 35% of Arcane Dust buy
  units sit above the whole-range median sell price, which the histogram shows
  as bad buying and this block shows as drift.

### `outcomes-trend` — Listing outcomes

- **Question:** of the units I listed, how many sold, expired, or did I pull?
- **Mark:** one stacked bar per time bucket, by units: sold, canceled, expired.
- **Needs:** per item, time bucket: sold units, expired units, canceled units.
- **Toolbar:** `Units · Share`.
- **Readout:** `Week` · `Sold` · `Canceled` · `Expired` · `Listing success` 79%.
- **Idle:** "Units per listing attempt. Relisted stock is counted each time."
- **Empty:** "No listing activity for {item} in this range."
- **Unavailable:** "Needs the expired and canceled files from the export."
- **Status:** redesign. Units replace rows; canceled joins the denominator; the
  red "slow" flag is removed (11 of its 12 hits were items with 3–11 lifetime
  events).

### `pipeline-balance` — Inputs and outputs

- **Question:** what went into this conversion, what came out, and what is left?
- **Mark:** two ranked bar lists sharing a gold axis: what member items cost
  growing left from a centre gutter, what they earned growing right. Each side
  ranks every member, so an output that was also bought on the AH appears on
  the left as well. Six rows per side plus an "Other member items" row, always
  seven rows. The gutter shows the pipeline margin, sold − bought over all
  members, uncoloured and captioned "stock on hand is not counted".
- **Needs:** per pipeline: for each member item, side, units, gold, average unit
  price; totals per side. Pipeline definitions (below).
- **Toolbar:** `Gold · Units`; an `Edit pipeline` button that opens an overlay.
- **Readout:** `Item` · `Side` Input · `Units` · `Gold` · `Share of side` 61%.
- **Idle:** "Left: what you bought. Right: what you sold. The export does not
  link a purchase to what it became; membership is yours to edit."
- **Empty:** "No activity for this pipeline in this range."
- **Unavailable:** "Needs both the purchases and sales files."
- **Status:** new. This is the built-out form of the "DE source" card.

**Pipelines.** A pipeline is a named pair of item sets, stored as
`03-data-architecture.md` §8 defines: each member carries a `share` of that
item's cost or revenue, shares for one item sum to at most 1 across pipelines,
and whatever is left is reported as "unassigned" so pipelines plus unassigned
always equal the portfolio. The export records no conversions, so membership is
a user-owned definition with generated defaults:

- An item's *role* in a range is `input` when its sold units are under 10% of
  its bought units, `output` when at least half its sold units were not bought
  on the AH (sold − bought ≥ half of sold; expired units are not added, see
  section 5), otherwise `flip`.
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
- **Needs:** per scope (pipeline or portfolio), time bucket: spend, revenue.
- **Toolbar:** `Cumulative · Per bucket`.
- **Readout:** `Through` 17 Nov · `Spend` · `Revenue` · `Gap` +1,240g.
- **Idle:** "Revenue is net of the AH cut. Unsold stock is not counted, so a
  negative gap can be inventory, not loss."
- **Empty:** "No AH buys or sells in this range."
- **Status:** redesign of daily P&L. All-items daily P&L was positive on 45 days
  and negative on 51 — buy days and sell days. The cumulative line was the
  useful half, so it is the default.

### `outcomes-by-item` — Outcomes by item

- **Question:** which of the items that matter have a churn or expiry problem?
- **Mark:** eight horizontal stacked bars (sold, canceled, expired, by units)
  for the top eight items by revenue in scope. More rows scroll inside the block.
- **Needs:** per item in scope: sold, expired, canceled units; revenue for ranking.
- **Toolbar:** `Share · Units`; sort `Revenue · Canceled · Expired`.
- **Readout:** `Item` · `Sold` · `Canceled` · `Expired` · `Listing success`.
- **Idle:** "Ranked by revenue, so the long tail stays out of the way."
- **Unavailable:** as `outcomes-trend`.
- **Status:** redesign. Ranking by revenue is the fix: the sample's churn is in
  Arcane Dust and Greater Planar Essence, which the old threshold never flagged.

### `item-ledger` — Items

- **Question:** which items carry the business, and what is each one's role?
- **Mark:** a virtualised table with a sticky header, fixed row height, sorted
  by revenue. Columns: item, kind (commodity or item, when known), role,
  pipeline, sold units, revenue, share of revenue, bought units, spend, listing
  success. Clicking a row selects the item; a row action opens it in the Item
  workspace.
- **Needs:** per item in range: the totals above, role, pipeline, kind.
- **Toolbar:** role filter `All · Outputs · Inputs · Flips`; a text filter field.
- **Readout:** `Item` · `Avg sell` · `Avg buy` · `First seen` · `Last seen`.
- **Idle:** "{n} items · {k} carry 80% of revenue."
- **Empty:** "No AH activity in this range."
- **Status:** new. It is the browsing surface for a catalogue that only grows:
  1,224 items in 15 weeks of one trader's data.
- **With `marketContext.daily`:** one more column, average sell vs market value.
  The table scrolls horizontally inside the block if it does not fit.

### `concentration` — Revenue concentration

- **Question:** how few items is this business really about?
- **Mark:** a cumulative-share curve over items ranked by revenue, with the 80%
  crossing marked.
- **Needs:** ranked revenue per item in range.
- **Toolbar:** `Revenue · Spend`.
- **Readout:** `Rank` 4 · `Item` · `Share` 7.8% · `Cumulative` 82%.
- **Idle:** "{k} of {n} sold items make 80% of revenue."
- **Status:** new. Sample: 4 of 168 sold items are 82% of revenue; the spend
  side is the opposite shape (1,095 items), which the toggle shows.

### `house-split` — By auction house

- **Question:** how much went through each house, and what did the neutral
  house's higher cut cost?
- **Mark:** four fixed rows (Alliance, Horde, Blackwater, Unassigned) with
  revenue and estimated cut paid.
- **Needs:** revenue and units per house; cut rate per house from the dataset
  settings.
- **Capability:** `houseAttribution`, which the data layer reports with a
  coverage figure. Faction houses follow from each character's faction, set once
  at import. Blackwater sales are indistinguishable in the export, so they
  appear only where the trader has written a rule (character, item or date
  range → Blackwater).
- **Readout:** `House` · `Revenue` · `Units` · `Cut rate` 15% · `Est. cut paid`,
  the last as a low–high range for unassigned rows.
- **Idle:** "Faction from your characters; Blackwater only where you have told
  the tool. {coverage}% of auction revenue attributed."
- **Unavailable:** "Assign each character a faction in dataset settings to
  split revenue by auction house."
- **Status:** new. The 5% and 15% cuts are single-source figures, so they are
  dataset settings and never constants in a block.

### `fees` — Fees and upkeep

- **Question:** what did trading cost besides the goods?
- **Mark:** a short ranked list of ledger categories with totals, and a line for
  transfers between the trader's own characters shown separately and excluded
  from the total.
- **Needs:** ledger totals by type in range; which counterparties are own characters.
- **Toolbar:** none.
- **Readout:** `Type` · `Total` · `Entries` · `Share of revenue` 0.04%.
- **Unavailable:** "Needs the income and expenses files."
- **Status:** cash flow, demoted from a tab to an `S` block. Sample: postage
  6.9g and repairs 33.1g against 103,339g revenue. If the Forever export
  records deposits, this is where forfeited deposits appear, and the block is
  promoted to `M` in a later arrangement revision.

## 5. KPI strip

Always six cards, always in these positions. A card with nothing to show
prints `—` and a one-line reason; it never disappears.

| # | Item workspace | Pipeline workspace | Portfolio workspace |
| --- | --- | --- | --- |
| 1 | **Revenue** · units · avg/unit | **Sold** · units, all members | **Revenue** · sold items |
| 2 | **Spend** · units · avg/unit | **Bought** · all members | **Spend** · bought items |
| 3 | **Flip margin** (coloured) | **Pipeline margin** (uncoloured) | **Net gold flow** (uncoloured) |
| 4 | **Off-AH supply** | **Margin %** of spend | **80% of revenue from** n items |
| 5 | **Listing success** | **Listing success** (members) | **Listing success** |
| 6 | **Peak 8 hours** | **Top output** · share | **Fees and upkeep** |

- **Flip margin** replaces per-item Net P&L: matched units (the smaller of
  bought and sold) × (average sell − average buy). For Greater Planar Essence
  that is 1,204 units × 0.38g ≈ 455g, against the roughly +26,300g the current
  card shows. With no AH buys it reads `—` · "not bought on the AH — see pipeline".
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
| Sold | `--profit` | 7.6:1 | solid fill |
| Canceled | `--loss` | 3.9:1 | solid fill |
| Expired | `--text-secondary` outline | 5.4:1 | hatched, no fill |

- The existing `--sell` rgb(83,74,183) is 2.2:1 on the card surface, below the
  3:1 needed for a graphic. It stays for tinted backgrounds; marks and lines use
  `--sell-mark`, which is the same hue and clearly lighter than `--buy`
  (relative luminance 0.41 against 0.26).
- Buy and sell are never distinguished by colour alone: fill versus ring, and
  left versus right.
- The heatmap keeps the viridis ramp in `components/heatmap/colorScale.ts`.
  A cell with no sales is the surface colour, not the bottom of the ramp. The
  legend always shows the ramp's maximum as a number.
- Profit and loss colours appear only on a signed number.

**Money.** Forever keeps copper precision and launch-era prices are small
(Mageweave was reported at 8s in launch week), so a fixed two-decimal gold format hides the whole price.

| Value | Format | Example |
| --- | --- | --- |
| Unit price under 1s | copper | `47c` |
| Unit price under 1g | silver and copper | `8s 40c` |
| Unit price under 100g | gold and silver | `6g 52s` |
| Unit price 100g and over | whole gold | `1,234g` |
| Totals 10,000g and over | thousands | `33.7k g` |
| Axis ticks | decimal gold, unit in the axis title | `6.50` |

- The current `33.7kg` suffix reads as kilograms; it becomes `33.7k g`.
- Unit prices are labelled "per unit, net to you". No block reconstructs the
  buyer's gross price except `house-split`, which knows the cut.
- Whether a Forever sale row is recorded net of the cut is unknown. The dataset
  setting defaults to net (what TSM records in every other edition), figures are
  shown as recorded, and until the trader confirms the basis the dataset status
  chip and every block footer that shows gold carry "price basis unconfirmed".
- All numerals are tabular. Units are integers with separators.

**Time.**

- Every block subtitle ends with the display zone abbreviation.
- Hours are `00`–`23`. Dates are `Tue 17 Nov`. Week buckets are labelled by
  their reset day: `Wk of 17 Nov`.
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

Pins are stored per scope. Item groups (random-enchant gear, and any group the
trader defines by pattern) appear in all three as single entries.

## 8. Not built

| Not built | Why |
| --- | --- |
| Counterparty views | 5,819 distinct buyers; the top ten are 4% of revenue. |
| Per-character splits | One character is 98% of sale rows. |
| Standalone price histogram | Pools a range in which prices drift 21–101%; replaced by `spread-weeks` and the binned columns of `price-timeline`. |
| Per-item Net P&L, per-item daily P&L bars | +25,175g / −22,282g / −12,599g for three legs of two conversions. |
| Price colour mode on the heatmap | −0.7% to +4.2% after week-normalising, beside a 4–8× volume swing. |
| "Slow mover" flag | 11 of 12 hits had 3–11 lifetime events. |
| Cash-flow tab | 40g of fees against 103,339g of revenue. |
| All-items timing heatmap | Less concentrated than any single top item (28% in the top tenth of cells against 34–56% for the four largest items) and item signatures differ by weekday. |
| Cross-ruleset or cross-faction comparison | Each ruleset × faction is a separate market; TSM removed its own merged view in 4.15.8. |
| Black Market and token tracking | Players cannot list on the Black Market; neither appears in an Accounting export. |

## 9. Phasing

**Phase 1 — a Forever Accounting export, schema unknown.** Everything here
needs only purchases, sales, expired and canceled rows with an item, a
quantity, a unit price and a time, mapped at import:

`kpi-strip`, `timing-heatmap`, `price-timeline`, `post-windows`, `spread-weeks`,
`outcomes-trend`, `outcomes-by-item`, `cumulative-flow`, `pipeline-balance`
(with the generated "All conversions" pipeline), `item-ledger`, `concentration`,
`fees` (if ledger files exist), and `house-split` for the two faction houses.

Phase 1 is safe against the open unknowns because it counts units and gold, bins
prices, takes the reset day and cut from settings, and treats item grouping as
pattern rules.

**Waiting on a specific unknown:**

| Feature | Waits on |
| --- | --- |
| Blackwater in `house-split` without hand-written rules | Whether the export attributes a sale to a house (unknown 2). Faction houses work from day one via the character → faction mapping. |
| Forfeited deposits in `fees` and as a KPI | Deposit formula and whether the export records deposits (unknown 6). |
| Commodity / item tag in ledger and combobox | A reliable per-item kind; the commodity list is single-source (unknown 3). |
| Default random-enchant group for Forever | The Forever item-string format (unknown 4). |
| Correct default reset day outside the US | Published reset schedule (unknown 5). Configurable from day one. |
| Sale-time correction on the heatmap | Whether TSM's Forever timestamps are mail time or sale time. |
| Raid-reset reading of the heatmap | Raids opening on 9 Dec 2026, then several weeks of data. |

**Phase 2 — `marketContext`.** Market-value line on `price-timeline`, a market
column in `item-ledger`, both from a daily TSM public-data file the trader drops
in or opts in to fetch. This is the only phase that can fetch anything from
outside the browser; the rules that keep it compatible with "your trading data
never leaves your browser" are in `03-data-architecture.md` §4. The heatmap's
`Market` mode needs hourly snapshots and therefore a server; it is not planned.
