# Layout system: shell, blocks, grid

The Forever edition adds markets, blocks and history to a page that already
moves under the user's cursor. This document specifies a layout in which the
geometry of the page is decided by exactly two inputs — the workspace and the
breakpoint — and nothing a user selects, hovers or loads can change it.

Companion documents: `03-data-architecture.md` owns `useBlockQuery`, scopes and
capabilities; `05-block-catalog.md` owns which blocks and workspaces exist. This
document owns the size tokens, the shell and the block contract they plug into.

## 1. Where the current page moves

Measured with Playwright at 1440×900 on the sample data (see `01-evaluation.md`).
Every row below is a place where content, state or data decides a box size.

| # | Trigger | Measured | Cause in code |
| --- | --- | ---: | --- |
| 1 | Switch chart tab | panel 483–635px, footer travels 152px | `Dashboard.tsx:255-280` mounts one of six panels, each with its own height: `ScatterChart.tsx:103` `clamp(420px,55vh,720px)`, `DailyPnLChart.tsx:106` `clamp(360px,50vh,640px)`, `PriceDistributionChart.tsx:80` `clamp(320px,45vh,560px)`, `CashFlowPanel.tsx:134` `clamp(340px,48vh,600px)` plus a stat grid at `:139`, `SellThroughPanel.tsx:64` `max-h-[480px]`, and seven heatmap rows of `h-12 md:h-14 lg:h-16` at `SaleHeatmap.tsx:168` |
| 2 | Hover a heatmap cell | panel +72px | `SaleHeatmap.tsx:110` renders `CellTooltip` in flow; it swaps a one-line `<p>` (`:221-223`) for a padded stat grid (`:227`) |
| 3 | Pick a non-curated item | everything below +36px (layout-shift score 0.476) | `ItemChips.tsx:57` appends an extra "pinned" chip to a `flex-wrap` row (`:48`), which wraps to a second line |
| 4 | Open Custom range | everything below +78px | `DateRangePicker.tsx:96-97` renders the date form inline under the presets |
| 5 | Viewport 1100px | control bar 221px instead of 185px at rest | same `flex-wrap` row as #3 |
| 6 | Boot | whole page replaced twice | `app/page.tsx:28` Suspense fallback `<p>Loading…</p>` → `Dashboard.tsx:98-99` `<p>Loading…</p>` → `:102-104` full-page `UploadZone` or `:106` dashboard |
| 7 | "Upload more files…" | a ~260px zone appears between panel and footer | `Dashboard.tsx:282-289` appends `UploadZone` in flow when `showUpload` |
| 8 | Item or range with no rows | chart card replaced by a ~70px paragraph | early returns at `ScatterChart.tsx:21-23`, `DailyPnLChart.tsx:25-27`, `PriceDistributionChart.tsx:20-22`, `CashFlowPanel.tsx:25-27`, `SellThroughPanel.tsx:36-38` |
| 9 | Fewer table rows, "hide empty" toggle | sell-through panel shrinks | `SellThroughPanel.tsx:64` caps height but does not fix it |
| 10 | Stat cards across widths | 1, 2 or 3 rows | `StatCards.tsx:15` `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`; sub-line at `:93` is untruncated and can wrap in a narrow card |

Not measured but unguarded in the same way: the heatmap header is a `flex-wrap`
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

1. **Geometry is a function of (workspace, breakpoint).** Item, range, scope,
   edition, data, loading state, hover and focus never change the position or
   size of any shell region or block.
2. **A block has one size token for life.** It is declared in the registry and
   is not a prop.
3. **Every state paints the same box.** Loading, ready, empty, error, stale and
   unavailable are different contents of the body, never different roots.
4. **Nothing in flow is conditional.** Anything that appears on demand —
   menus, search results, date forms, upload, tooltips — is an overlay
   (popover or dialog) or occupies a slot that was already reserved.
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

```
┌──────────────────────────────────────────────────────────────────────────┐
│ A  scope bar      44px   brand · edition · market ▾ · zone ▾ ·· status · ⋯ │  static
├──────────────────────────────────────────────────────────────────────────┤
│ B  context bar    48px   [item ▾] quick · quick · quick …   │ range     │  sticky
│ C  workspace nav  40px   Item   Pipeline   Portfolio              More ▾ │  sticky
├──────────────────────────────────────────────────────────────────────────┤
│ D  KPI strip      88px   six kpi slots                                   │
│ E  canvas                workspace grid (§5), min-height fills viewport  │
├──────────────────────────────────────────────────────────────────────────┤
│ F  page footer    32px   static text only                                │
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Height | Contents | Overflow behaviour |
| --- | ---: | --- | --- |
| A scope bar | 44 | Brand, edition switch, market switch, display-zone switch, dataset status, Manage data | Market switch is one 240px button showing `US · PvP · Horde`, truncated; it opens a popover listbox grouped region → ruleset (the dataset) → house (a filter inside it, including "All houses"), max-height 360px with internal scroll. Twelve markets or sixty cost the same 240px. The display-zone switch is a 132px button (`Local · AEDT`) opening a searchable popover of IANA zones. |
| B context bar | 48 | Subject combobox, quick row, range | See below. |
| C workspace nav | 40 | One tab per workspace | Single line; tabs that do not fit collapse into `More ▾`. |
| D KPI strip | 88 (wide), 188 (medium), 264 (narrow) | Exactly six `kpi` slots | A workspace supplies up to six KPIs; unused slots render as blank cells. The strip never changes height within a breakpoint. |
| E canvas | content | Workspace grid | `min-height` set to the viewport minus the chrome above it, so a short workspace never makes the document shorter than the viewport. |
| F footer | 32 | Privacy line, version | Static. Carries no live state. |

Decisions:

- **Status moves from the footer into the scope bar.** Today
  `Dashboard.tsx:291-297` puts realm, row counts and load time under the panel,
  where they travel 152px between tabs. In the shell they are one fixed-width
  (200px) status chip in bar A with the detail in a popover. The page footer
  below the canvas still moves when workspaces differ in length, which is
  acceptable because it is static text that nobody is aiming at.
- **B and C are sticky; A is not.** Item, range and workspace are changed
  constantly and must stay under the cursor; edition and market are changed
  rarely. Sticky cost is 88px, not 132px.
- **`scrollbar-gutter: stable` on `<html>`.** Workspaces differ in length, so
  without it the page width changes by a scrollbar when switching between a
  short and a long one.
- **The marketing header in `app/page.tsx:13-26` collapses into the brand slot
  of bar A.** The tagline moves to the onboarding block.

### Context bar in detail

```
[ Greater Planar Essence ···· ▾ ] [quick][quick][quick][quick][quick] │ [This week][7d][30d][90d][All] [Custom ▾]  Nov 4 – Nov 24
   260px fixed combobox             five 132px slots, OverflowRow        segmented, fixed            92px     168px fixed
```

- **Subject combobox (260px).** Always shows the current item, truncated with
  the full name in `title`; typing in it searches. Its overlay list has the
  sections `05-block-catalog.md` §7 specifies (Pinned, Top by revenue, All) and
  is virtualised past ~200 entries. This one control replaces today's chip
  row, appended "pinned" chip and separate search field, so selecting any item
  — curated or not, short name or `Pattern: Comfortable Leather Hat` — changes
  text inside a fixed box. On the Pipeline workspace the same slot is the
  pipeline combobox; on Portfolio it reads "All items" and is disabled, not
  removed.
- **Quick row.** At most five fixed-width (132px) slots: pinned items first,
  then top-by-revenue to fill. One line, `flex-nowrap; overflow: hidden`,
  inside the shared `OverflowRow` primitive, which measures with a
  `ResizeObserver` and drops slots from the end when the bar is too narrow
  (they remain reachable in the combobox). A sixth slot never appears, and
  which items fill the slots can change when the dataset, market or range
  changes — never on item selection. Slots are disabled, not removed, on
  workspaces without a single item.
- **Range.** A five-option segmented control, one `Custom ▾` button whose
  popover holds both the reset-week picker and the date inputs, and a
  fixed-width, tabular-numeral label for the resolved dates. The inline form
  at `DateRangePicker.tsx:96` goes away.

`OverflowRow` is used three times — the quick row, workspace tabs, and block toolbars —
so "too many things for one line" has a single implementation.

### Upload, manage data, onboarding

- **Manage data and upload are a modal `<dialog>`.** Parsing progress and
  errors (`UploadZone.tsx:119-129`) render inside the dialog.
- **First run uses the same shell.** With no dataset, bars A–C render with
  controls disabled, the KPI strip shows blank cells, and the canvas holds one
  `XL` onboarding block containing the drop zone and "Load sample data". Going
  from empty to loaded changes the contents of blocks, not the page.
- **Boot paints the shell, not "Loading…".** See §4 "Routing".

## 4. Block shell contract

A block is a registry entry plus a body component. The shell owns the box, the
chrome and every non-ready state; the body draws data into a rectangle it is
handed.

### Anatomy

```
┌───────────────────────────────────────────────┐
│ header   40px  title · summary        ◌  ⋯   │  always
│ toolbar  36px  [Units|Revenue] [Local|UTC]    │  if chrome.toolbar
│                                               │
│ body     remaining height, overflow hidden    │  always
│                                               │
│ readout  44px  When · Units · Revenue · Sales │  if chrome.readout
│ footer   24px  legend / source / n of m       │  if chrome.footer
└───────────────────────────────────────────────┘
```

- **Which zones exist is static**, declared in `chrome`. A block cannot gain a
  toolbar at runtime.
- **Header.** Title comes from the registry, so it paints before any data. The
  summary line (`27,612 units · 30.7kg gross`) is one truncated line. The `◌`
  slot is a reserved 16px square for the stale/refreshing indicator.
- **Readout.** The reserved replacement for in-flow tooltips. Idle, it shows a
  hint; on hover or keyboard focus the body calls `setReadout(fields)` and the
  shell lays the fields out in fixed-width columns. This removes the +72px
  heatmap growth, and gives keyboard users the same information as hover.
- **`kpi` blocks** have their own fixed anatomy: label (16px), value (28px,
  tabular numerals), sub-line (14px, always rendered, `—` when empty), each one
  truncated line.
- **Root CSS:** `contain: strict; overflow: hidden; container-type: size`.
  The grid supplies the size; containment guarantees content cannot change it.

### States

`useBlockQuery` returns `{ status, data, isStale }`. The shell maps it:

| Condition | Header | Toolbar | Body |
| --- | --- | --- | --- |
| capability missing | title | disabled | **Unavailable**: one line saying what data would enable it (e.g. "Needs market snapshots — this dataset is an Accounting export") |
| `loading`, no previous data | title | disabled | Skeleton for the block's `bodyKind` (chart, grid, table, stat). Shown only after 150ms to avoid a flash on fast queries. |
| `ready` | title + summary | live | Body component |
| `ready` + `isStale` | title + old summary, `◌` spinning | live | Previous render at 60% opacity. No skeleton. |
| `empty` | title | live | Centred one-line reason ("No sales of Thorium Bar in this range") |
| `error` | title | disabled | Message + Retry. Also the fallback of the per-block error boundary. |

Two consequences worth stating: the early-return paragraphs from audit row 8
become the `empty` row here, and a block whose capability is missing **stays in
place** — a Classic dataset and a Forever dataset produce the same grid, with
some blocks marked unavailable.

### Types

```ts
export type SizeToken = "kpi" | "S" | "M" | "L" | "XL";
export type BodyKind = "stat" | "chart" | "grid" | "table";

export interface BlockContext {
  scope: QueryScope;      // dataset, house, range, tz, source — owned by 03-data-architecture
  subject: ItemRef | { pipeline: string } | null;   // null on portfolio workspaces
}

export interface BlockBodyProps<D, L> {
  data: D;
  box: { width: number; height: number };   // CSS px, measured by the shell
  ctx: BlockContext;
  local: L;                                  // toolbar state
  setReadout: (fields: ReadoutField[] | null) => void;
}

export interface BlockDefinition<Q = unknown, D = unknown, L = {}> {
  id: string;                                // stable; used for test ids and URL state
  title: string;
  size: SizeToken;
  bodyKind: BodyKind;
  chrome: { toolbar: boolean; readout: boolean; footer: boolean };
  requires: Capability[];                    // enum owned by 03-data-architecture
  needsItem: boolean;
  local?: LocalStateSpec<L>;                 // toolbar controls + defaults
  query: (ctx: BlockContext, local: L) => Q;   // ctx.scope carries the time bucket
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
  coordinates. A unit test runs `layoutWorkspace(def, breakpoint)` — a pure
  function that also serves the geometry tests in §8 — and fails if any
  breakpoint leaves a hole in a row or a `kpis` entry is not size `kpi`.
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
`<p>Loading…</p>` at `app/page.tsx:28`) becomes the same grid of skeleton
blocks. Existing `?tab=` links redirect to the matching workspace.

## 5. Grid

The canvas is a container; the grid responds to the canvas width, not the
viewport, so it behaves the same if a side panel is ever added.

```css
html { scrollbar-gutter: stable; }

.canvas  { container: canvas / inline-size; max-width: 1600px; margin-inline: auto; }

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

@container canvas (width < 960px) {          /* medium: 6 columns */
  .ws-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .ws-grid > [data-size="S"]  { grid-column: span 3; }
  .ws-grid > [data-size="M"],
  .ws-grid > [data-size="L"],
  .ws-grid > [data-size="XL"] { grid-column: span 6; }
}
@container canvas (width < 600px) {          /* narrow: 2 columns */
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
| `S` | 4 of 12 | 3 of 6 | full | 388 | 356 |
| `M` | 6 of 12 | full | full | 388 | 356 |
| `L` | full | full | full | 388 | 356 |
| `XL` | full | full | full | 588 | 448 |

- **Heights are fixed pixels, not `vh`.** The current `clamp(…vh…)` heights are
  the reason six panels have six heights, and they make the result depend on
  window height. A fixed row unit makes `layoutWorkspace` a pure calculation.
- **Three discrete arrangements, no fluid in-between.** Resizing the window
  across a threshold re-flows once; that is a window resize, not an interaction.
- **At 1600px and above the canvas stops growing** (the existing cap,
  `app/page.tsx:12`). No 16- or 24-column mode: it would be a fourth
  arrangement to validate for every workspace, and a 12-column `S` is already
  ~500px at the cap.
- **XL body budget at wide:** 588 − 40 header − 36 toolbar − 44 readout − 24
  footer ≈ 440px, i.e. seven heatmap rows of ~58px, against 64px today.
- **Inside a block, use container queries** (`@container (width < 420px)`) to
  drop tick labels, abbreviate headers or hide secondary table columns. The
  same `S` block is 300px wide in one arrangement and 470px in another, which
  viewport breakpoints cannot express. Container queries may change density,
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
- **Reserve axis space.** Every y-axis gets
  `afterFit: (axis) => { axis.width = 56; }`, the x-axis a fixed 28px height,
  and ticks a fixed `maxTicksLimit` with a compact formatter of at most six
  characters. The plot rectangle is then identical for Arcane Dust at 1g and
  Spellcloth at 56g.
- **No canvas legend.** `plugins.legend.display = false`; legends are HTML in
  the block footer. The canvas legend wraps by label length and takes its
  height out of the plot.
- **Tooltips never enter flow.** Use the readout slot; a Chart.js tooltip is
  acceptable as a secondary canvas overlay.
- **Update, don't remount.** Bodies keep one chart instance and call
  `chart.update("none")` on new data. Do not key the chart on the item.

**Heatmap grid**

- Row and column tracks come from the body box:
  `grid-template-rows: 20px repeat(7, minmax(0, 1fr))`. The viewport-class
  heights at `SaleHeatmap.tsx:168` go.
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
with `data-block-id`. `snapshotGeometry(page)` returns the bounding rect of
each, plus `document.scrollingElement.scrollHeight`. Chart bodies expose their
plot rectangle as `data-plot-rect` so the inner frame is checked too.

**Matrix.** Viewports 1440×900, 1100×800, 820×1180, 390×844 × datasets (sample
Classic export, large synthetic Forever export, none) × every workspace:

| Interaction | Asserted invariant |
| --- | --- |
| Item: each quick-row slot, a searched 40-character name, an item with zero rows in range, an item group | all regions, blocks and plot rects |
| Range: each preset, open and apply Custom, a range with no data | all regions, blocks and plot rects |
| Market / edition switch, including a market with no data | all regions and blocks |
| Every toolbar control of every block | all regions and blocks |
| Pointer sweep (5×5 points) and keyboard focus through every block body | all regions and blocks |
| Lifecycle: cold boot with 4× CPU throttle and delayed IndexedDB; forced query error; revalidation; open and close each popover and the data dialog; clear data | all regions and blocks |
| Workspace switch | regions A–D unchanged; block rects equal `layoutWorkspace()` output |
| Any state | `scrollWidth === clientWidth` (no horizontal overflow) |

**Pass criteria.** Maximum delta of any edge of any region or block: **0.5px**
(sub-pixel rounding only). Plot rectangles: 1px. Document height delta within
a workspace: 0. Workspace switch against the model: 1px.

**Dev tripwire.** In development the shell attaches a `ResizeObserver` to each
block root and throws if its size changes without a breakpoint change. This
catches a violation at the moment it is written.

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
4. **Build the shell bars.** `OverflowRow`, subject combobox, quick row, range popover,
   data dialog, status chip in bar A, onboarding block, shell-shaped boot.
   Fixes rows 3–7.
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

- **Analytics:** every block picks exactly one of `kpi | S | M | L | XL` and
  declares statically whether it has a toolbar, a readout and a footer. A
  workspace lists at most six KPIs and about sixteen blocks, in order, and must
  pack into full rows at 12 columns (`S S S`, `M M`, `L` or `XL`).
  Detail-on-hover goes in the readout, not a tooltip that needs space.
- **Data:** `useBlockQuery` must accept an `enabled` flag (lazy mounting), keep
  the previous result while revalidating, distinguish `empty` from `ready`, and
  take its time bucket from the shell. The capability set must be
  resolvable synchronously from the loaded dataset so an unavailable block
  never flashes a skeleton first.
