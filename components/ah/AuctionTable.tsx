"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { nextSort, readPref, writePref, type SortKey } from "@/lib/prefs";

// A results table modelled on the WoW: Forever auction house browse list.
// The client builds every list from the same parts: each column is either a
// fixed width or a share of the remaining width ("fill"), has its own left
// and right cell padding, and has either a sortable header or a plain label;
// rows are one fixed height; selection and hover are callbacks; and "results
// pending / no results / results" are states of the same frame. This is an
// original React implementation of that structure, sized for a block body:
//
// - the table never sizes itself: it fills the body and scrolls inside it
//   (layout law 6 — 4 rows and 4,000 rows are the same height)
// - rows are virtualised, so a 1,224-item catalogue costs ~20 rendered rows
// - sorting and filtering change rows, never column widths
// - sorting is two-key like the auction house: clicking a column makes it the
//   primary key and keeps the previous primary as the tie-breaker; the arrow
//   shows on the primary only; the sort is remembered per table (storageKey)

export type Column<R> = {
  id: string;
  header: string;
  /** Fixed width in px. */
  width?: number;
  /** Share of the remaining width; `minWidth` stops it collapsing. */
  fill?: number;
  minWidth?: number;
  align?: "left" | "right";
  padLeft?: number;
  padRight?: number;
  /** Present when the column can be sorted. */
  sortValue?: (row: R) => number | string;
  /** Full text shown on hover, for cells that may truncate. */
  titleOf?: (row: R) => string;
  render: (row: R) => ReactNode;
};

export type SortState = SortKey;

type Props<R> = {
  rows: R[];
  columns: Column<R>[];
  rowKey: (row: R) => string;
  initialSort?: SortState[];
  /** Remember the sort under this key across sessions. */
  storageKey?: string;
  selectedKey?: string | null;
  onSelect?: (row: R) => void;
  onHover?: (row: R | null) => void;
  /** Right-click on a row (the auction house uses it to favourite). */
  onRowContextMenu?: (row: R) => void;
  label: string;
};

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 28;
const OVERSCAN = 6;
const STANDARD_PADDING = 10;

export function AuctionTable<R>({ rows, columns, rowKey, initialSort, storageKey, selectedKey, onSelect, onHover, onRowContextMenu, label }: Props<R>) {
  const [sort, setSort] = useState<SortKey[]>(() => {
    const fallback = initialSort ?? [];
    if (!storageKey) return fallback;
    const saved = readPref<SortKey[]>(`sort:${storageKey}`, fallback);
    // Drop keys for columns that no longer exist.
    const valid = saved.filter((k) => columns.some((c) => c.id === k.id && c.sortValue));
    return valid.length ? valid : fallback;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, height: 400 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView({ top: el.scrollTop, height: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(() => {
    const keys = sort
      .map((k) => ({ get: columns.find((c) => c.id === k.id)?.sortValue, mul: k.dir === "asc" ? 1 : -1 }))
      .filter((k): k is { get: (row: R) => number | string; mul: number } => Boolean(k.get));
    if (keys.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const { get, mul } of keys) {
        const va = get(a);
        const vb = get(b);
        const d = typeof va === "string" || typeof vb === "string" ? String(va).localeCompare(String(vb)) : va - vb;
        if (d !== 0) return mul * d;
      }
      return 0;
    });
  }, [rows, columns, sort]);

  const template = columns
    .map((c) => (c.width != null ? `${c.width}px` : `minmax(${c.minWidth ?? 120}px, ${c.fill ?? 1}fr)`))
    .join(" ");
  const minWidth = columns.reduce((s, c) => s + (c.width ?? c.minWidth ?? 120), 0);

  const first = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(sorted.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);

  const onHeader = (c: Column<R>) => {
    if (!c.sortValue) return;
    setSort((s) => {
      const next = nextSort(s, c.id);
      if (storageKey) writePref(`sort:${storageKey}`, next);
      return next;
    });
  };

  const cellPad = (c: Column<R>) => ({
    paddingLeft: c.padLeft ?? STANDARD_PADDING,
    paddingRight: c.padRight ?? STANDARD_PADDING,
    textAlign: c.align ?? "left",
  });

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label={label}
      aria-rowcount={sorted.length + 1}
      className="absolute inset-0 overflow-auto overscroll-contain"
      style={{ scrollbarGutter: "stable" }}
      onScroll={(e) => {
        const el = e.currentTarget;
        setView({ top: el.scrollTop, height: el.clientHeight });
      }}
      onMouseLeave={() => onHover?.(null)}
    >
      <div style={{ minWidth }}>
        <div
          role="row"
          className="sticky top-0 z-10 grid items-center bg-[#1d1d1d] text-[10px] uppercase tracking-wide text-[#999]"
          style={{ gridTemplateColumns: template, height: HEADER_HEIGHT }}
        >
          {columns.map((c) => {
            const active = sort[0]?.id === c.id;
            const tieBreak = sort[1]?.id === c.id;
            return (
              <div key={c.id} role="columnheader" aria-sort={active ? (sort[0].dir === "asc" ? "ascending" : "descending") : "none"} style={cellPad(c)}>
                {c.sortValue ? (
                  <button
                    type="button"
                    onClick={() => onHeader(c)}
                    className={`w-full truncate uppercase tracking-wide ${active ? "text-[#e0e0e0]" : "hover:text-[#e0e0e0]"}`}
                    style={{ textAlign: c.align ?? "left" }}
                    title={active ? "Primary sort. Click to reverse." : tieBreak ? "Tie-breaker sort. Click to make it primary." : "Click to sort by this column."}
                  >
                    {c.header}
                    <span className="inline-block w-3">{active ? (sort[0].dir === "desc" ? "↓" : "↑") : ""}</span>
                  </button>
                ) : (
                  <span className="block truncate">{c.header}</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ height: sorted.length * ROW_HEIGHT, position: "relative" }}>
          {sorted.slice(first, last).map((row, i) => {
            const key = rowKey(row);
            const selected = key === selectedKey;
            return (
              <div
                key={key}
                role="row"
                aria-rowindex={first + i + 2}
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onSelect?.(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(row);
                  }
                }}
                onMouseEnter={() => onHover?.(row)}
                onFocus={() => onHover?.(row)}
                onContextMenu={(e) => {
                  if (!onRowContextMenu) return;
                  e.preventDefault();
                  onRowContextMenu(row);
                }}
                className={`absolute left-0 right-0 grid cursor-pointer items-center border-t border-[#2e2e2e] text-xs outline-none hover:bg-[#2c2c2c] focus-visible:bg-[#2c2c2c] ${
                  selected ? "bg-[#1f2a26] text-[#e0e0e0]" : "text-[#e0e0e0]"
                }`}
                style={{ gridTemplateColumns: template, height: ROW_HEIGHT, top: (first + i) * ROW_HEIGHT }}
              >
                {columns.map((c) => (
                  <div key={c.id} role="gridcell" className="truncate" style={cellPad(c)} title={c.titleOf?.(row)}>
                    {c.render(row)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
