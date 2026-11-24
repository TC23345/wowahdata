# Forever edition — design overview

A design for taking `wowahdata` from one Classic realm to WoW: Forever, built
around two requirements: it must keep working as markets, items and history grow,
and nothing a user selects, hovers or loads may move the page.

This is a design, not an implementation. No application code has changed.

| Document | What it settles |
| --- | --- |
| [01-evaluation.md](01-evaluation.md) | Which of today's views carry signal, with numbers from the sample export, and how much the current page moves |
| [02-forever-facts.md](02-forever-facts.md) | What is known about Forever's auction house, resets and TSM support, each fact tagged by confidence |
| [03-data-architecture.md](03-data-architecture.md) | Edition profile, market scope, import and merge, storage, worker cubes, query API, fees, pipelines |
| [04-layout-system.md](04-layout-system.md) | Layout laws, app shell, block contract, grid, renderer rules, the geometry test |
| [05-block-catalog.md](05-block-catalog.md) | Workspaces, the twelve blocks, KPI strip, encoding rules, what is not built |

A clickable mockup of the shell, the three workspaces and the block states, filled
with the sample export's real figures, is on the design canvas:
<https://claude.ai/artifact/CKnctiwRHiToi7ZRzBx9iN> (private to the owner unless
shared). It was drawn before the review below: it shows the wide layout only, and
the price timeline and item ledger at the `L` size rather than the `XL` the design
now specifies.

The three design sections were written in parallel by separate designers,
reconciled, then checked by an independent reviewer who had not seen the work.
The review found three blocking problems — shell bars that did not fit below about
1,500px, a first-run state that changed the grid, and an import rule that could
drop rows — and all three are fixed in the documents as they stand.

## What the current tool gets right

Measured on the bundled Nightslayer sample (20,902 rows, 21 Jan – 6 May 2026):

- **Timing is the strongest signal, and the heatmap is the right hero.** The best
  six hours of the day hold 49–56% of units for the three largest items; the worst
  six hold 7–11%. Weekday patterns differ by item.
- **Price against time beats price distribution.** Flip spreads are 4–7%;
  week-to-week drift is 29–115%. The scatter shows that; the histogram hides it.
- **The "DE source" card points at the real business.** 1,095 items were bought
  and 168 sold: this is a conversion pipeline (gear and cloth in; dust, essences,
  shards, bolts and bags out), and per-item P&L misreads it in both directions.

And where it misleads: the heatmap's per-cell price (a 12.7% gap that is about 1%
after normalising by week), row-based sell-through (96% by rows, 64% by units once
cancels count), and a cash-flow tab for 40g of fees against 103,339g of revenue.

## Defects found in the current app along the way

Each was confirmed against the code by the reviewer; none is fixed here.

- **Uploading a subset of files wipes the rest.** "Upload more files" with only a
  new sales file replaces the stored realm with one that has empty purchases,
  expired, canceled, income and expenses (`lib/parse.ts:88-101` with
  `components/Dashboard.tsx:75-79`). The README promises "drop any subset".
- **Parsing runs on the main thread.** `lib/parse-worker.ts` exists but nothing
  imports it.
- **Cash-flow week keys shift a day east of UTC** (`lib/cashflow.ts:18-21`).
- **Unparseable numbers become zero silently** (`lib/parse.ts:10-17`), so a changed
  export format would load as rows of zeros.
- **Revenue and P&L include vendor, trade and COD rows** (`lib/transform.ts` has no
  source filter).

## What Forever changes

1. No realms. A market is region × ruleset × house: two faction houses and a
   neutral one per ruleset, 12 markets per region.
2. Retail-style commodities: per-unit prices, partial fills, later-posted sells
   first at equal price. One row is not one stack.
3. The neutral house reportedly takes 15%, not 5%, and the export probably cannot
   say which house a sale went through.
4. Markets span many timezones, and the weekly reset day differs by region.
5. Level cap 60 forever: history only grows.
6. Several things an importer depends on are unknown today — the filename token
   that replaces the realm, the Forever CSV columns, whether sale prices are net.

## The design in brief

**One codebase, two editions.** Everything edition-specific — filename pattern,
scope dimensions, cut rates, week start, item identity, random-enchant grouping —
lives in an `EditionProfile`. The Classic profile reproduces today's behaviour
exactly; the Forever profile marks every unverified value as a per-dataset setting.

**Data is queried, not filtered.** A Web Worker owns the dataset. Events are
stored as month-partitioned typed-array chunks in IndexedDB and pre-aggregated
into cubes keyed on the UTC hour — including a fine price cube for the price
timeline — so a block query costs cells, not rows, and a timezone change needs no
rebuild. Imports merge instead of replace, tracking which intervals each export
actually covered. The design point is one million events per dataset.

**Geometry depends on two things only: the workspace and the breakpoint.** A
shell of fixed-height bars with stated contents per breakpoint, a 12-column grid
with an 88px row unit, and five block sizes (`kpi`, `S`, `M`, `L`, `XL`). Every block state — loading, ready, stale,
empty, error, unavailable — paints the same box. Anything that appears on demand
is an overlay or occupies a slot that was already reserved. CSS containment makes
a violation show up as clipped content in one block instead of a page shift.

**Three workspaces replace six tabs.** *Item* (timing heatmap, price timeline,
listing windows, buy/sell spread, listing outcomes), *Pipeline* (inputs and outputs,
spend against revenue, outcomes by item) and *Portfolio* (item ledger,
concentration, house split, fees). Adding a block is a registry entry and one line
in a workspace definition.

**Acceptance is geometric.** Browser CLS reports ~0 for today's shifts because
they follow clicks. The test instead snapshots the bounding box of every shell
region and block and asserts a maximum movement of 0.5px across an interaction
matrix.

## Decisions taken where the designers differed

| Question | Decision | Why |
| --- | --- | --- |
| Is a faction part of the dataset? | No. Dataset = edition × region × ruleset; house is a derived filter | The export has no house column; a character's faction fixes its house, and rules cover the neutral house |
| Item selection | One 260px combobox plus at most five fixed-width quick slots | Nothing is ever appended, so selecting an item cannot wrap a row |
| Price marks | Always binned: one mark per time bucket, price bin and side | Mark count is independent of row count, and a Forever commodity row is of unknown shape |
| Time bucket | Derived from the range (day, reset week, month), never chosen by a block | Caps every time axis at about 60 columns for any history length |
| Unconfirmed price basis | Treat as net, show figures as recorded, flag it once on the dataset | A 15% uncertainty band on every number would swamp the 4–7% spreads the tool exists to show |
| Pipeline margin | Sold − bought over every member item on both sides | Pipelines plus unassigned then always equal the portfolio |
| Profit colour | Only on flip margin (matched units) | Pipeline and portfolio totals omit unsold stock, so a negative is not necessarily a loss |
| Reset week | Anchored to a UTC instant per dataset, not to midnight in the display zone | Changing the display zone must not move week buckets or baselines |
| Auction house of a sale | Faction house is labelled "assumed" unless the trader confirms it | Any character can use the neutral house and no row reveals it |
| No data loaded | The normal grid with every block unavailable; onboarding is a dialog | Loading or clearing data must not change the block list |
| Price timeline and item ledger | `XL`, not `L` | An `L` body is 244px: too short for binned marks, and seven table rows of 1,224 |

## Decisions that are yours

1. **Binned price marks replace the per-row bubble scatter.** This departs from
   the `gpe_scatter.py` reference the original PRD said to port exactly. The
   buy-left / sell-right reading and square-root sizing are kept; individual
   jittered bubbles are not. If the per-row look matters to you on small Classic
   datasets, it can be kept as a second renderer under a point budget, at the cost
   of two code paths.
2. **Optional market prices.** Comparing your prices with the market means
   fetching a public TSM price file. The design allows it only as an opt-in,
   whole-market download that sends nothing about your trades, and changes the
   promise to "your trading data never leaves your browser". The alternative is to
   never fetch and only accept a file you drop in.
3. **Same app or a separate one.** The design evolves `wowahdata` so Classic users
   get the layout and scaling work too. A separate Forever app would be simpler to
   ship but would fork the layout system.
4. **How much to build before a real Forever export exists.** Steps 1–5 below are
   edition-agnostic. Everything after depends on seeing one real export.

## Build order

1. Geometry test against today's markup, with the known failures recorded.
2. Global rules: stable scrollbar gutter, chart animation off, HTML legends, fixed
   axis widths, one gold formatter.
3. `BlockShell` and the size tokens; wrap the six existing panels; hover detail
   moves to the readout slot.
4. Shell bars: combobox, quick row, range popover, data dialog, status chip.
5. Registry, workspaces and routing; stat cards become KPI blocks.
6. `EditionProfile` with the Classic profile; canonical events; parsing in the
   worker; IndexedDB v2 and migration.
7. Cubes, `useBlockQuery`, capabilities; port blocks one at a time; merge on
   re-import.
8. Forever profile, import mapping, dataset settings, fee model.
9. Item groups and pipelines; the new blocks.
10. Market context, if chosen.

## What to obtain before step 8

One real Forever TSM Accounting export. It settles the filename token, the column
set, whether random-enchant items still appear as `?`, how commodity sales are
recorded, and — with one remembered sale — whether prices are net.
