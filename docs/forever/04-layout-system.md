# Layout system: shell, blocks, grid

The Forever edition adds markets, blocks and history to a page that already
moves under the user's cursor. This document specifies a layout in which the
geometry of the page is decided by exactly two inputs — the workspace and the
canvas width — and nothing a user selects, hovers or loads can change it.

Companion documents: `03-data-architecture.md` owns `useBlockQuery`, scopes and
capabilities; `05-block-catalog.md` owns which blocks and workspaces exist. This
document owns the size tokens, the shell and the block contract they plug into.

## 1. Where the current page moves

Every row below is a place where content, state or data decides a box size.
Rows 1–5 were measured with Playwright on the sample data (1440×900; row 5 at
1100×800; see `01-evaluation.md`). Rows 6–10 come from reading the code and
were not exercised by that baseline.

| # | Trigger | Observed | Cause in code |
| --- | --- | ---: | --- |
| 1 | Switch chart tab | panel 483–635px, footer travels 152px | `Dashboard.tsx:255-280` mounts one of six panels, each with its own height: `ScatterChart.tsx:103` `clamp(420px,55vh,720px)`, `DailyPnLChart.tsx:106` `clamp(360px,50vh,640px)`, `PriceDistributionChart.tsx:80` `clamp(320px,45vh,560px)`, `CashFlowPanel.tsx:134` `clamp(340px,48vh,600px)` plus a stat grid at `:139`, `SellThroughPanel.tsx:64` `max-h-[480px]`, and seven heatmap rows of `h-12 md:h-14 lg:h-16` at `SaleHeatmap.tsx:168` |
| 2 | Hover a heatmap cell | panel +72px | `SaleHeatmap.tsx:110` renders `CellTooltip` in flow; it swaps a one-line `<p>` (`:221-223`) for a padded stat grid (`:227`) |
| 3 | Pick a non-curated item | everything below +36px (layout-shift score 0.476) | `ItemChips.tsx:57` appends an extra "pinned" chip to a `flex-wrap` row (`:48`), which wraps to a second line |
| 4 | Open Custom range | everything below +78px | `DateRangePicker.tsx:96-97` renders the date form inline under the presets |
| 5 | Viewport 1100px | control bar 221px instead of 185px at rest | same `flex-wrap` row as #3 |
| 6 | Boot | code reading: whole page replaced twice | `app/page.tsx:28` Suspense fallback `<p>Loading…</p>` → `Dashboard.tsx:98-99` `<p>Loading…</p>` → `:102-104` full-page `UploadZone` or `:106` dashboard |
| 7 | "Upload more files…" | code reading: the upload zone (260px tall on the empty page) appears between panel and footer | `Dashboard.tsx:282-289` appends `UploadZone` in flow when `showUpload` |
| 8 | Item or range with no rows | code reading: chart card replaced by a one-line paragraph | early returns at `ScatterChart.tsx:21-23`, `DailyPnLChart.tsx:25-27`, `PriceDistributionChart.tsx:20-22`, `CashFlowPanel.tsx:25-27`, `SellThroughPanel.tsx:36-38` |
| 9 | Dataset with few sold or expired items | code reading: sell-through panel is shorter than 480px | `SellThroughPanel.tsx:64` caps the table with `max-h-[480px]` instead of fixing its height. (The "hide empty" checkbox is not a source: its filter at `:25` removes rows that `lib/sellthrough.ts:36-45` never creates.) |
| 10 | Stat cards across widths | code reading: 1, 2 or 3 rows | `StatCards.tsx:15` `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`; sub-line at `:93` is untruncated and can wrap in a narrow card |

Also from code reading, and unguarded in the same way: the heatmap header is a `flex-wrap`
row containing the item name (`SaleHeatmap.tsx:44`), so a long name pushes the
toggles onto a second line; Chart.js legends are drawn inside the canvas
(`ScatterChart.tsx:75`, `DailyPnLChart.tsx:80`, `PriceDistributionChart.tsx:68`,
`CashFlowPanel.tsx:92`) and take a variable slice of plot height; no chart sets
`animation`, so every data swap runs Chart.js's default one-second tween; and a
page that grows past the viewport gains a scrollbar and loses ~15px of width.

The common root is one pattern, repeated: **a component returns a different
element, or a different number of elements, depending on state**, and its parent
sizes to content. The fix is structural rather than a list of patches.

## 2. Layout laws

A reviewer checks a PR against these seven statements.

1. **Geometry is a function of (workspace, canvas width).** Item, range, scope,
   edition, data, loading state, hover and focus never change the position or
   size of any shell region or block. Only resizing the window does.
2. **A block has one size token for life.** It is declared in the registry and
   is not a prop.
3. **Every state paints the same box.** Loading, ready, empty, error, stale and
   unavailable are different contents of the body, never different roots.
4. **Nothing in flow is conditional.** Anything that appears on demand —
   menus, search results, date forms, upload, tooltips — is an overlay in the
   browser's top layer or occupies a slot that was already reserved.
5. **Chrome is single-line.** Text in bars, headers, KPIs and readouts truncates;
   collections that outgrow their row collapse into a "+N" menu. No `flex-wrap`
   outside block bodies.
6. **Content scrolls inside its block.** A table with 4 rows and a table with
   4,000 rows are the same height.
7. **Parents size children.** Bodies receive a pixel box and draw into it. They
   do not use viewport units, intrinsic heights or aspect ratios.

Laws 1–3 and 6–7 are enforced by CSS containment (§4), so a violation shows up as
visibly clipped content in the offending block instead of as a page shift.

## 3. App shell

The shell is rendered by a route layout and is identical for every workspace and
every data state, including "no data loaded yet".

**One width decides everything.** The shell is a single size container: 16px
side padding, capped at 1600px. Its content width **W** is what the bars and the
grid (§5) both query, so they change arrangement at the same instant. With the
scrollbar gutter always reserved, W = viewport − 47px (− 32px where scrollbars
overlay). Wide is W ≥ 960, medium 600–959, narrow below 600; W = 320 is the
smallest supported.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ A  scope bar      brand · edition · market ▾ · zone ▾ ···· status · ⋯     │  static
├───────────────────────────────────────────────────────────────────────────┤
│ B  context bar    [item ▾] quick · quick · quick …  │ range · Custom ▾    │  sticky
│ C  workspace nav  Item   Pipeline   Portfolio                     More ▾ │  sticky
├───────────────────────────────────────────────────────────────────────────┤
│ D  KPI strip      six kpi slots                                           │
│ E  canvas         workspace grid (§5)                                     │
├───────────────────────────────────────────────────────────────────────────┤
│ F  page footer    static text only                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

Contents and heights per arrangement (widths in px, gaps 12 unless noted):

| Region | Wide, W ≥ 960 | Medium, 600–959 | Narrow, < 600 |
| --- | --- | --- | --- |
| A scope bar | **44** — brand 120 · edition 148 · market 240 · zone 132 · spacer · status 200 · `⋯` 36 | **44** — brand 120 · market (flex, 160–320) · `⋯` 36 | **44** — brand mark 28 · market (flex, min 160) · `⋯` 36 |
| B context bar | **48** — combobox 260 · quick row · range 280 · `Custom ▾` 92 · dates 184 (only when W ≥ 1272) | **88**, two fixed lines — combobox, full width / range 280 · `Custom ▾` 92 | **48** — combobox (flex, min 200) · `Range ▾` 112 |
| C workspace nav | **40** — tabs in an `OverflowRow` with `More ▾` | **40** — same | **40** — same |
| Sticky cost (B + C) | 88 | 128 | 88 |
| D KPI strip | **88** — six slots in one row | **188** — two rows of three | **264** — three rows of two |
| F footer | **32** | **32** | **52**, two lines |

- **Bar A sheds by arrangement, not by measurement.** Below wide, the edition
  switch, zone switch, status and Manage data move into the `⋯` popover, and the
  `⋯` button carries a dot when the status has a caveat or is refreshing. Bar A
  is deliberately not an `OverflowRow`: what it drops has to land in a known
  place.
- **Market switch** shows `US · PvP · Horde`, truncated, and opens a listbox
  grouped region → ruleset (the dataset) → house (a filter inside it, including
  "All houses"), 360px tall with internal scroll. Twelve markets or sixty cost
  the same button.
- **Zone switch** reads `Local · AEDT` and opens a searchable list of IANA
  zones. It is the one place the display-zone abbreviation is always visible.
- **Status** is a 200px chip with the detail in a popover: dataset, row counts,
  load time (today under the panel at `Dashboard.tsx:291-297`, where it travels
  152px between tabs), and every dataset-level caveat — price basis unconfirmed,
  row-semantics warning, attribution coverage.
- **KPI strip** always has six slots; a workspace supplies up to six KPIs and
  the rest render blank.
- **Footer** holds the privacy line, the version and, when market context is
  on, the TSM attribution. The attribution slot is always reserved. The footer
  moves when workspaces differ in length, which is acceptable because it is
  static text nobody is aiming at.

Fixed widths, checked at the five test viewports:

| Viewport | W | Arrangement | Bar A | Bar B |
| ---: | ---: | --- | --- | --- |
| 1440 | 1393 | wide | 876 + 5 gaps × 12 = **936** | 860 fixed + 3 quick slots 412 = **1272** |
| 1100 | 1053 | wide | **936** | 668 fixed (no dates) + 2 quick slots 272 = **940** |
| 960 | 913 | medium | 120 + 12 + 320 + 12 + 36 = **500** | line 1: 913; line 2: 280 + 8 + 92 = **380** |
| 820 | 773 | medium | **500** | line 2: **380** |
| 390 | 343 | narrow | 28 + 12 + 255 + 12 + 36 = **343** | 223 + 8 + 112 = **343** |

Bar B's fixed part at wide is combobox 260 + range 280 + Custom 92 with gaps of
12, 16 and 8 = 668, or 860 with the 184px date label and its 8px gap. `n` quick
slots take `140n − 8`.

### Context bar in detail (wide)

```
[ Greater Planar Essence ···· ▾ ] [quick][quick][quick] │ [This week][7d][30d][90d][All] [Custom ▾]  21 Jan 26 – 6 May 26
   260 combobox                     132 each, 8 apart      280 segmented                  92          184, W ≥ 1272 only
```

- **Subject combobox.** Always shows the current item, truncated with the full
  name in `title`; typing in it searches. Its overlay list has the sections
  `05-block-catalog.md` §7 specifies (Pinned, Top by revenue, All) and is
  virtualised past ~200 entries. This one control replaces today's chip row,
  appended "pinned" chip and separate search field, so selecting any item —
  curated or not, short name or `Pattern: Comfortable Leather Hat` — changes
  text inside a fixed box. On the Pipeline workspace the same slot is the
  pipeline combobox; on Portfolio it reads "All items" and is disabled, not
  removed.
- **Quick row (wide only).** Up to five 132px slots — pinned items first, then
  top-by-revenue — in an `OverflowRow`, which drops slots from the end when
  they do not fit. How many fit is a function of W alone:

  | W | Date label | Quick slots |
  | --- | --- | ---: |
  | ≥ 1552 | shown | 5 |
  | 1412–1551 | shown | 4 |
  | 1272–1411 | shown | 3 |
  | 1220–1271 | dropped | 4 |
  | 1080–1219 | dropped | 3 |
  | 960–1079 | dropped | 2 |

  So a 1440px window shows three, a 1280px window four without the date label,
  a 1100px window two. Every item stays reachable in the combobox. Which items
  fill the slots can change with the dataset, market or range, never on item
  selection; slots are disabled, not removed, on workspaces without a single
  item.
- **Range.** A five-option segmented control and one `Custom ▾` button whose
  popover holds the reset-week picker and the date inputs. The inline form at
  `DateRangePicker.tsx:96` goes away. At narrow both collapse into a single
  `Range ▾` button whose popover holds presets and custom.
- **Date label.** The first thing dropped. It always uses the form
  `21 Jan 26 – 6 May 27`, two-digit years included, so a cross-year range is no
  wider than any other; 184px holds the longest case. Where it is dropped, the
  resolved dates head the Custom popover.

`OverflowRow` is used three times — quick row, workspace tabs, block toolbars —
so "too many things for one line" has a single implementation.

### Scrolling and sticky bars

A is static and B, C are sticky, so the sticky bars sit at the top of the
viewport only once the page has scrolled past A. Three rules keep them there
when the workspace changes:

- **The canvas has `min-height: calc(100vh − var(--sticky-h))`.** Every
  document is then at least a viewport plus A, D and F tall, so it can always
  scroll at least 164px — more than bar A's 44px. Switching from a long,
  scrolled workspace to a short one can clamp the scroll position but cannot
  pull A back into view.
- **Workspace navigation preserves `scrollY`** (`scroll: false` on the link or
  router call). Nothing scrolls to the top on its own.
- **`scroll-padding-top` on `<html>` equals the sticky height**, so keyboard
  focus and in-page links never land under the bars. The shell writes
  `--sticky-h` on the root element when its arrangement changes, because a
  container query cannot style its own ancestor.

`scrollbar-gutter: stable` on `<html>` covers the last case: without it the
page width changes by a scrollbar between a short and a long workspace.

### Overlays

Blocks are `contain: strict; overflow: hidden` and `OverflowRow` clips its
row, so an overlay rendered as a child would be cut off. **Every overlay — the
market, zone and `⋯` popovers, combobox list, range popovers, `More ▾`, a
toolbar's `+N`, a block's `⋯` menu, `Edit pipeline` — renders in the top layer**
(`popover` attribute, or `<dialog>.showModal()` for the data dialog) and is
positioned from its trigger's bounding rect. Today's overlays are absolutely
positioned children (`ItemChips.tsx:204`, `Dashboard.tsx:392`) and have to
change.

### No data, upload, boot

- **With no dataset the normal workspace grid renders**, every block in its
  unavailable state ("No data loaded") and every KPI showing `—`. There is no
  separate onboarding layout: loading a dataset, or clearing one, changes the
  contents of blocks and nothing else.
- **Manage data and upload are a modal `<dialog>`.** It opens automatically on
  a first visit; parsing progress and errors (`UploadZone.tsx:119-129`) render
  inside it. The first block's unavailable body also carries the "Load sample
  data / drop files" call to action for anyone who dismisses the dialog.
- **The marketing header at `app/page.tsx:13-26` collapses into the brand slot.**
  Its tagline moves into the data dialog.
- **Boot paints the shell, not "Loading…".** The statically generated page is
  the real grid for that workspace (§4 "Routing").

## 4. Block shell contract

A block is a registry entry plus a body component. The shell owns the box, the
chrome and every non-ready state; the body draws data into a rectangle it is
handed.

### Anatomy

```
┌──────────────────────────────────────────────────────┐
│ header   40px  title · summary             ● ◌  ⋯   │  always
│ toolbar  36px  [Units|Revenue|Consistency]           │  if chrome.toolbar
│                                                      │
│ body     remaining height, overflow hidden           │  always
│                                                      │
│ readout  44px  When (AEDT) │ Units │ Revenue │ Weeks │  if chrome.readout
│ footer   24px  legend                                │  if chrome.footer
└──────────────────────────────────────────────────────┘
```

- **Which zones exist is static**, declared in `chrome`. A block cannot gain a
  toolbar at runtime.
- **Header.** Title comes from the registry, so it paints before any data. The
  summary (`27,612 units · 30.7k g`) is one truncated line and never ends in
  something that must be read, such as a zone. Two 16px slots are always
  reserved to its right: `●` a caveat dot and `◌` the refreshing indicator.
- **Caveats are not footers.** A dataset-level caveat lives in the status chip
  (§3). A block it affects lights its caveat dot, with the text in the dot's
  `title` and in the readout while the header has focus.
- **Readout.** The reserved replacement for in-flow tooltips, and the reason
  the +72px heatmap growth disappears. It is a row of **fixed 128px columns**,
  each a 10px label over a 12px value of at most 16 characters. A block declares
  its fields in priority order and the shell shows the first
  `min(cap, ⌊(block width − 24) / 128⌋)` of them whole — never a clipped
  half-field. Caps are 3 for `S`, 4 for `M`, 5 for `L`/`XL`. At wide that is 2
  fields in an `S` below W = 1248 and 3 above, 3 in an `M` below W = 1084 and 4
  above, 5 in `L`/`XL`; at medium each block shows its cap (4 in `L`/`XL`
  below W = 664); at narrow, 2. The count depends on width alone.
  A "When" field carries the zone abbreviation on its label line so the value
  fits the column. Low–high ranges do not fit a column and are shown only in
  bodies with room for them (`house-split`, `fees`), never in a readout or KPI.
- **Pointer, keyboard and touch fill the same readout.** Hover or focus shows a
  cell or mark; a tap selects it and the readout stays filled until another tap.
- **Footer** carries the legend and nothing else.
- **`kpi` blocks** have their own fixed anatomy: label (16px), value (28px,
  tabular numerals), sub-line (14px, always rendered, `—` when empty), each one
  truncated line.
- **Root CSS:** `contain: strict; overflow: hidden; container-type: size`.
  The grid supplies the size; containment guarantees content cannot change it.
  Menus therefore open in the top layer (§3 "Overlays").

### States

`useBlockQuery` returns `{ status, data, isStale }`. The shell maps it:

| Condition | Header | Toolbar | Body |
| --- | --- | --- | --- |
| no dataset, or capability missing | title | disabled | **Unavailable**: one line saying what data would enable it ("No data loaded", or "Needs market snapshots — this dataset is an Accounting export") |
| `loading`, no previous data | title | disabled | Skeleton for the block's `bodyKind` (chart, grid, table, stat). Shown only after 150ms to avoid a flash on fast queries. |
| `ready` | title + summary | live | Body component |
| `ready` + `isStale` | title + old summary, `◌` spinning | live | Previous render at 60% opacity. No skeleton. |
| `empty` | title | live | Centred one-line reason ("No sales of Thorium Bar in this range") |
| `error` | title | disabled | Message + Retry. Also the fallback of the per-block error boundary. |

Two consequences worth stating: the early-return paragraphs from audit row 8
become the `empty` row here, and a block whose capability is missing **stays in
place** — no dataset, a Classic dataset and a Forever dataset all produce the
same grid, with more or fewer blocks marked unavailable.

Capabilities have to be known before the first paint, and IndexedDB is
asynchronous. The data layer therefore keeps a small synchronous mirror of the
dataset record — labels and capability flags, no trade data — which the shell
reads before painting block bodies, so an unavailable block never flashes a
skeleton. A block with several queries is `error` if any errors, `loading`
until all have data, and `empty` when its first-listed query is empty.

### Types

```ts
export type SizeToken = "kpi" | "S" | "M" | "L" | "XL";
export type BodyKind = "stat" | "chart" | "grid" | "table";

export interface BlockContext {
  scope: QueryScope;      // dataset, house, range, tz, source — owned by 03-data-architecture
  bucket: "day" | "week" | "month";                 // derived from the range by the shell
  subject: ItemRef | { pipeline: string } | null;   // null on portfolio workspaces
}

export interface BlockBodyProps<D, L> {
  data: D;                                   // one result per key of `queries`
  box: { width: number; height: number };    // CSS px, measured by the shell
  ctx: BlockContext;
  local: L;                                  // toolbar state
  setReadout: (values: Record<string, string> | null) => void;   // keyed by readout field
}

export interface BlockDefinition<D extends Record<string, unknown> = {}, L = {}> {
  id: string;                                // stable; used for test ids and URL state
  title: string;
  size: SizeToken;
  bodyKind: BodyKind;
  chrome: { toolbar: boolean; readout: boolean; footer: boolean };
  readout: string[];                         // field labels in priority order; [] without a readout
  requires: Capability[];                    // all of these — enum owned by 03-data-architecture
  requiresAny?: Capability[];                // and at least one of these
  needsItem: boolean;
  local?: LocalStateSpec<L>;                 // toolbar controls + defaults
  queries: (ctx: BlockContext, local: L) => { [K in keyof D]: BlockQuery };
  load: () => Promise<{ default: React.ComponentType<BlockBodyProps<D, L>> }>;
}

export interface WorkspaceDefinition {
  id: string;                                // URL path segment
  label: string;
  kind: "item" | "pipeline" | "portfolio";    // what the subject combobox selects
  kpis: string[];                            // ≤ 6 block ids, all size "kpi"
  blocks: string[];                          // block ids in placement order
}
```

- **Workspaces are data** and live in a `.ts` file, not `.tsx`. There is no
  JSX in which to write `{cond && <Block/>}`.
- **Placement is by order.** The grid auto-flows rows; a workspace has no x/y
  coordinates. `layoutWorkspace(def, canvasWidth)` is a pure function returning
  every block's rect; it also serves the geometry tests and tripwire in §8. A
  unit test fails if the wide arrangement leaves a hole in a row — the only
  arrangement where one is possible, since below wide every non-`kpi` block is
  full width — or if a `kpis` entry is not size `kpi`.
- **The time bucket is part of the context**, derived from the range (day up
  to six weeks, reset week up to a year, month beyond — `05-block-catalog.md`
  §2). Every time axis therefore has at most about 60 columns whatever the
  history length, and a block never chooses its own bucket.
- **Adding a block** is one definition, one body file, one line in a workspace.

### Routing

The workspace is a path segment, `/w/[workspace]`, statically generated from
the registry; item, range, market and toolbar state stay in query params. This
choice follows from law 1: the only input that changes geometry is in the path,
so the server-rendered HTML for a deep link already contains the right boxes,
and the Suspense fallback required by `useSearchParams` (today a bare
`<p>Loading…</p>` at `app/page.tsx:28`) is that same grid. Because a page with
no dataset is also that grid (§3), the static HTML is never replaced. Existing `?tab=` links redirect to the matching workspace.

## 5. Grid

The grid queries the same shell container as the bars (§3), so the canvas
width W is the only input and bars and blocks re-arrange together.

```css
html { scrollbar-gutter: stable; scroll-padding-top: var(--sticky-h); }

.shell   { container: shell / inline-size; max-width: 1600px; margin-inline: auto; padding-inline: 16px; }
.canvas  { min-height: calc(100vh - var(--sticky-h)); }   /* --sticky-h: 88px, 128px at medium */

.ws-grid {
  display: grid;
  gap: 12px;
  grid-auto-flow: row;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: 88px;
}
.ws-grid > [data-size="kpi"] { grid-column: span 2;  grid-row: span 1; }
.ws-grid > [data-size="S"]   { grid-column: span 4;  grid-row: span 4; }
.ws-grid > [data-size="M"]   { grid-column: span 6;  grid-row: span 4; }
.ws-grid > [data-size="L"]   { grid-column: span 12; grid-row: span 4; }
.ws-grid > [data-size="XL"]  { grid-column: span 12; grid-row: span 6; }

@container shell (width < 960px) {           /* medium: 6 columns */
  .ws-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .ws-grid > [data-size="S"],
  .ws-grid > [data-size="M"],
  .ws-grid > [data-size="L"],
  .ws-grid > [data-size="XL"] { grid-column: span 6; }
}
@container shell (width < 600px) {           /* narrow: 2 columns */
  .ws-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 80px; }
  .ws-grid > [data-size="kpi"] { grid-column: span 1; }
  .ws-grid > [data-size="S"],
  .ws-grid > [data-size="M"],
  .ws-grid > [data-size="L"]  { grid-column: span 2; }
  .ws-grid > [data-size="XL"] { grid-column: span 2; grid-row: span 5; }
}

.block { contain: strict; overflow: hidden; container-type: size; }
```

Resulting block sizes (height is `rows × unit + (rows − 1) × 12`):

| Token | Wide ≥ 960 | Medium 600–959 | Narrow < 600 | Height wide / medium | Height narrow |
| --- | --- | --- | --- | ---: | ---: |
| `kpi` | 2 of 12 (six per row) | 2 of 6 (three per row) | 1 of 2 | 88 | 80 |
| `S` | 4 of 12 (312–525px) | full | full | 388 | 356 |
| `M` | 6 of 12 | full | full | 388 | 356 |
| `L` | full | full | full | 388 | 356 |
| `XL` | full | full | full | 588 | 448 |

- **Heights are fixed pixels, not `vh`.** The current `clamp(…vh…)` heights are
  the reason six panels have six heights, and they make the result depend on
  window height. A fixed row unit makes `layoutWorkspace` a pure calculation.
- **Three discrete arrangements.** Within one, columns stretch with W; across
  a threshold the grid re-flows once. Both are window resizes, not interactions.
- **`S` is a third of a row only at wide.** At medium it spans all six columns,
  because three-up `S` blocks would otherwise leave half a row empty.
- **At 1600px and above the canvas stops growing** (the existing cap,
  `app/page.tsx:12`). No 16- or 24-column mode: it would be a fourth
  arrangement to validate for every workspace, and a 12-column `S` is already
  525px at the cap.
- **Body budgets.** With every zone present a body gets the block height minus
  146px (2 border, 40 header, 36 toolbar, 44 readout, 24 footer): **442px in
  `XL`, 242px in `S`/`M`/`L`** at wide and medium, 302px and 210px at narrow.
  A time chart also gives 28px to its axis, and a table 28px to its header.
  That is why `price-timeline` and `item-ledger` are `XL` (414px of plot, or
  fourteen 28px rows) and not `L` (214px, seven rows). The heatmap's tracks
  are `20px repeat(7, minmax(0, 1fr)) 40px` — hour labels, seven days, the
  hour-marginal row — which leaves day rows of about 52px in `XL`, against
  64px today.
- **Inside a block, use container queries** (`@container (width < 420px)`) to
  drop tick labels, abbreviate headers or hide secondary table columns. The
  same `S` block is 312px wide at the bottom of wide and over 900px at the top
  of medium, which viewport breakpoints cannot express. Container queries may change density,
  never the box.

## 6. Renderer rules

These stop movement *inside* a block, where containment cannot help.

**Chart.js**

- Keep `responsive: true, maintainAspectRatio: false` (already set, e.g.
  `ScatterChart.tsx:51-52`); the parent is now a fixed box.
- **Animations off for data changes.** Set `Chart.defaults.animation = false`
  in `chartjsSetup.ts`; allow only the `active` (hover) transition. A
  one-second tween on every item switch reads as movement and hides the stale
  → ready handover.
- **Reserve axis space.** Every value axis gets
  `afterFit: (axis) => { axis.width = 56; }`, the x-axis a fixed 28px height,
  and ticks a fixed `maxTicksLimit` with a compact formatter of at most six
  characters. The plot rectangle is then identical for Arcane Dust at 1g and
  Spellcloth at 56g. Bar-list bodies such as `outcomes-by-item` have no axis;
  they use fixed 28px rows and a fixed label column.
- **No canvas legend.** `plugins.legend.display = false`; legends are HTML in
  the block footer. The canvas legend wraps by label length and takes its
  height out of the plot.
- **Tooltips never enter flow.** Use the readout slot; a Chart.js tooltip is
  acceptable as a secondary canvas overlay.
- **Update, don't remount.** Bodies keep one chart instance and call
  `chart.update("none")` on new data. Do not key the chart on the item.

**Heatmap grid**

- Row and column tracks come from the body box:
  `grid-template-rows: 20px repeat(7, minmax(0, 1fr)) 40px`, with a fixed
  column for the day marginal. The viewport-class heights at
  `SaleHeatmap.tsx:168` go.
- At narrow widths the grid keeps its 640px minimum and scrolls horizontally
  inside the body (as at `SaleHeatmap.tsx:74-79`).

**Tables**

- `table-layout: fixed` with declared column widths; rows a fixed 28px; sticky
  header; the scroller is the body with `overscroll-behavior: contain` and
  `scrollbar-gutter: stable`.
- Virtualise beyond ~200 rows. Sorting and filtering change rows, never widths.

**Numbers and text**

- `font-variant-numeric: tabular-nums` on every number.
- One shared `fmtGold` with a bounded output length. There are currently three
  separate formatters (`fmtGold` at `SaleHeatmap.tsx:15` and `StatCards.tsx:5`,
  `fmt` at `CashFlowPanel.tsx:16`).
- Optional lines are always rendered (`—` when empty). The conditional
  sub-lines at `StatCards.tsx:93` and `CashFlowPanel.tsx:173` go.
- **Fonts stay on the system stack** (`globals.css`, `chartjsSetup.ts:35`), so
  there is no web-font swap. If a web font is ever added it needs
  `font-display: optional`.
- Icons are inline SVG with explicit `width`/`height`. Item icons, if Forever
  data brings them, sit in a fixed 20×20 box with a placeholder.

## 7. Scalability

| Growth | What absorbs it |
| --- | --- |
| 10× blocks | The registry. A workspace is capped at about 16 blocks; more blocks means more workspaces, and the nav's `More ▾` absorbs those. `Dashboard.tsx` is not edited to add one. |
| Many blocks on one page | The shell renders every block's box immediately (pure CSS). The body mounts, and its query is enabled, only when the block comes within 600px of the viewport (`IntersectionObserver`). Bodies more than two viewports away unmount; the box stays. `content-visibility: auto` on `.block` skips paint for the rest — safe because the grid, not the content, sizes the block. |
| Bundle size | `load()` is a dynamic import per body. Chart.js lands in a shared chunk pulled by the first chart body. The Suspense fallback for code is the same skeleton as for data. |
| A block that throws | Per-block error boundary rendering the `error` state in place; reset when `ctx` changes. |
| 12 markets per region | One fixed-width market switch (§3). Cross-market comparison is small multiples **inside** one `L`/`XL` block with a fixed cell grid; market count never changes block count. |
| 1,000+ items | Fixed subject combobox with a virtualised overlay, virtualised tables, truncation everywhere a name appears. |
| Long histories | The time bucket is derived from the range, so a series has at most about 60 columns and a price timeline at most 60 × 48 × 2 marks; the axis keeps a fixed tick count; zoom and brush are in-canvas overlays. |
| Slow computation | Item and range changes are wrapped in `startTransition`; blocks show the stale state while workers compute, so controls respond immediately and nothing blanks. |

## 8. Verification

Browser CLS reports ~0 for almost every problem in §1, because each follows a
click or happens below the fold. The acceptance test therefore asserts geometry
directly.

**Harness.** The shell marks every region with `data-region` and every block
with `data-block-id`. `snapshotGeometry(page)` returns, for each, its rect in
document coordinates and — for the sticky regions B and C — its rect relative
to the viewport as well, plus `scrollY` and the document's `scrollHeight`.
Chart bodies expose their plot rectangle as `data-plot-rect` so the inner frame
is checked too.

**Matrix.** Viewports 1440×900, 1100×800, 960×800, 820×1180, 390×844 × datasets
(none, sample Classic export, large synthetic Forever export) × every workspace:

| Interaction | Asserted invariant |
| --- | --- |
| Item: each quick-row slot, a searched 40-character name, an item with zero rows in range, an item group | all regions, blocks and plot rects |
| Range: each preset, open and apply Custom, a cross-year range, a range with no data | all regions, blocks and plot rects |
| Market, zone and edition switch, including a market with no data | all regions and blocks |
| Every toolbar control of every block | all regions and blocks |
| Pointer sweep (5×5 points), tap, and keyboard focus through every block body and header | all regions and blocks |
| Lifecycle: cold boot with 4× CPU throttle and delayed IndexedDB; no dataset → load sample → clear data; forced query error; revalidation | all regions and blocks; document height |
| Open each overlay, including block `⋯` and `More ▾` | all regions and blocks; the overlay's four corners hit-test to the overlay (it is not clipped) |
| Workspace switch, started at `scrollY` 0, 20 and 2000 | A–D unchanged in document coordinates; B and C unchanged in viewport coordinates; block rects equal `layoutWorkspace(def, W)` |
| Any state | `scrollWidth === clientWidth`; no shell control is clipped or overlaps another |

**Pass criteria.** Maximum delta of any edge of any region or block: **0.5px**
(sub-pixel rounding only). Plot rectangles: 1px. Document height delta within
a workspace: 0. Workspace switch against the model: 1px.

**Dev tripwire.** In development the shell attaches a `ResizeObserver` to each
block root and compares what it observes with `layoutWorkspace(def, W)` for
the current W. Height must match on every observation; width is compared only
between observations at the same W, because columns are `1fr` and legitimately
stretch as the window is resized. A mismatch throws, which catches a violation
at the moment it is written.

**Conventions that keep violations out.**

- Body components receive no `className` for their root and cannot reach the
  shell's; the shell owns it.
- ESLint `no-restricted-syntax` under `components/blocks/**` bans class strings
  containing `vh`, `min-h-`, `max-h-`, `h-auto` and `aspect-`; under
  `components/shell/**` it bans `flex-wrap`.
- Workspace files are `.ts`.
- The seven laws are the PR checklist.

## 9. Migration from `Dashboard.tsx`

Each step is a small PR and removes rows from the known-failing list of the
geometry test.

1. **Test first.** Add Playwright and the geometry harness against today's
   markup, with the §1 failures recorded as expected. This is the ratchet.
2. **Global rules with no structure change.** `scrollbar-gutter: stable`;
   Chart.js animation off, HTML legends, fixed axis widths; one `fmtGold`.
3. **Introduce `BlockShell` and the size tokens.** Wrap the six existing panels
   as bodies and map their early returns to `empty`. Move `CellTooltip` into
   the readout slot. Tabs remain, each showing one block. Fixes audit rows 2, 8
   and 9 and reduces row 1 to two heights (`L` and `XL`).
4. **Build the shell bars.** The three arrangements of A–C, `OverflowRow`,
   subject combobox, quick row, top-layer popovers, data dialog with first-run
   auto-open, status chip, grid-shaped boot and no-data state. Fixes rows 3–7.
5. **Registry, workspaces and `/w/[workspace]`.** Stat cards become `kpi`
   blocks in the strip; tabs become workspaces that hold several blocks; `?tab=`
   redirects. Fixes rows 1 and 10.
6. **Adopt `useBlockQuery`** in place of the `useMemo` chain at
   `Dashboard.tsx:163-177`; stale state replaces synchronous recompute.
7. **Lazy mount, code-split, error boundaries, dev tripwire.**
8. **Edition profile and capability gating;** add the Forever workspaces from
   `05-block-catalog.md`.

Steps 1–5 are edition-agnostic and improve the Classic dashboard on their own.

## What the other designers need to conform to

- **Analytics:** every block picks exactly one of `kpi | S | M | L | XL`,
  declares statically whether it has a toolbar, a readout and a footer, and
  lists its readout fields in priority order (values of at most 16 characters;
  an `S` may show only two). A workspace lists at most six KPIs and about
  sixteen blocks, in order, and must pack into full rows at 12 columns
  (`S S S`, `M M`, `L` or `XL`). Anything with a time axis and full chrome, or
  a table meant for browsing, is `XL`. Footers hold legends; caveats go to the
  status chip and the header's caveat dot.
- **Data:** `useBlockQuery` must accept an `enabled` flag (lazy mounting), keep
  the previous result while revalidating, distinguish `empty` from `ready`, and
  take its time bucket from the shell. Capability flags and dataset labels
  must be readable synchronously before first paint from a mirror that holds
  no trade data.
