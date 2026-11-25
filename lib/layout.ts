// Geometry of a workspace (docs/forever/04-layout-system.md §5).
//
// Page geometry is a function of exactly two inputs: the workspace (an ordered
// list of block size tokens) and the canvas width. Nothing a user selects,
// hovers or loads changes it. This module is the single source of those
// numbers; app/globals.css implements the same table in CSS, and
// layoutWorkspace() lets tests and the geometry check predict every block rect.

/** `page` is one chart filling its own page: full width, the tallest box. */
export type SizeToken = "kpi" | "S" | "M" | "L" | "XL" | "page";
export type Arrangement = "wide" | "medium" | "narrow";

export const GAP = 12;

export const ARRANGEMENTS: Record<
  Arrangement,
  { columns: number; rowUnit: number; spans: Record<SizeToken, { cols: number; rows: number }> }
> = {
  wide: {
    columns: 12,
    rowUnit: 88,
    spans: {
      kpi: { cols: 2, rows: 1 },
      S: { cols: 4, rows: 4 },
      M: { cols: 6, rows: 4 },
      L: { cols: 12, rows: 4 },
      XL: { cols: 12, rows: 6 },
      page: { cols: 12, rows: 7 },
    },
  },
  medium: {
    columns: 6,
    rowUnit: 88,
    spans: {
      kpi: { cols: 2, rows: 1 },
      S: { cols: 6, rows: 4 },
      M: { cols: 6, rows: 4 },
      L: { cols: 6, rows: 4 },
      XL: { cols: 6, rows: 6 },
      page: { cols: 6, rows: 7 },
    },
  },
  narrow: {
    columns: 2,
    rowUnit: 80,
    spans: {
      kpi: { cols: 1, rows: 1 },
      S: { cols: 2, rows: 4 },
      M: { cols: 2, rows: 4 },
      L: { cols: 2, rows: 4 },
      XL: { cols: 2, rows: 5 },
      page: { cols: 2, rows: 6 },
    },
  },
};

/** Breakpoints are on the canvas (container) width, not the viewport. */
export function arrangementFor(canvasWidth: number): Arrangement {
  if (canvasWidth >= 960) return "wide";
  if (canvasWidth >= 600) return "medium";
  return "narrow";
}

export function blockHeight(token: SizeToken, arrangement: Arrangement): number {
  const a = ARRANGEMENTS[arrangement];
  const rows = a.spans[token].rows;
  return rows * a.rowUnit + (rows - 1) * GAP;
}

export type Rect = { x: number; y: number; w: number; h: number };

export type WorkspaceLayout = {
  arrangement: Arrangement;
  rects: Rect[];
  /** Rows that do not fill every column. A valid workspace has none. */
  holes: { row: number; emptyColumns: number }[];
  height: number;
};

/**
 * Pack size tokens into the grid in order, the way `grid-auto-flow: row`
 * places them, and return each block's rect in canvas coordinates.
 */
export function layoutWorkspace(tokens: SizeToken[], canvasWidth: number): WorkspaceLayout {
  const arrangement = arrangementFor(canvasWidth);
  const a = ARRANGEMENTS[arrangement];
  const colWidth = (canvasWidth - (a.columns - 1) * GAP) / a.columns;

  const rects: Rect[] = [];
  const holes: WorkspaceLayout["holes"] = [];
  let col = 0;
  let y = 0;
  let rowIndex = 0;
  let rowHeight = 0;

  const closeRow = () => {
    if (col > 0 && col < a.columns) holes.push({ row: rowIndex, emptyColumns: a.columns - col });
    y += rowHeight + GAP;
    rowIndex += 1;
    col = 0;
    rowHeight = 0;
  };

  for (const token of tokens) {
    const span = a.spans[token];
    if (col + span.cols > a.columns) closeRow();
    const h = blockHeight(token, arrangement);
    rects.push({
      x: col * (colWidth + GAP),
      y,
      w: span.cols * colWidth + (span.cols - 1) * GAP,
      h,
    });
    col += span.cols;
    rowHeight = Math.max(rowHeight, h);
    if (col === a.columns) closeRow();
  }
  if (col > 0) closeRow();

  return { arrangement, rects, holes, height: Math.max(0, y - GAP) };
}
