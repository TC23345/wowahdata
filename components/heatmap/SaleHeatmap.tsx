"use client";

import { useMemo, useState } from "react";
import type { PurchaseSaleRow } from "@/lib/csv";
import { binToHeatmap, type HeatmapMode, type HeatmapTz } from "@/lib/heatmap";
import { fmtGold } from "@/lib/format";
import { cellColor, getHeatmapStops } from "./colorScale";
import { useTheme } from "@/lib/useTheme";

type Props = {
  rows: PurchaseSaleRow[];
  itemName: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtHourRange(h: number): string {
  return `${String(h).padStart(2, "0")}:00–${String(h).padStart(2, "0")}:59`;
}

export function SaleHeatmap({ rows, itemName }: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<HeatmapMode>("units");
  const [tz, setTz] = useState<HeatmapTz>("local");
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);

  const matrix = useMemo(() => binToHeatmap(rows, mode, tz), [rows, mode, tz]);
  // Resolve once per render. `theme` triggers re-render via useTheme(), so the
  // freshly-read CSS-var stops always match the active theme. (Reading 11 CSS
  // vars per render is cheap; no need to memoize.)
  void theme;
  const stops = getHeatmapStops();

  const hovered = hover ? matrix.cells[hover.d][hover.h] : null;
  const tzLabel = tz === "local"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "local"
    : "UTC";

  return (
    <section
      aria-label={`Sale heatmap for ${itemName}`}
      className="rounded-lg border border-border bg-surface p-5"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            {itemName}
          </h2>
          <p className="text-xs text-text-secondary">
            {matrix.totalUnits.toLocaleString()} units sold ·{" "}
            {fmtGold(matrix.totalGold)} gross · {tzLabel}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <ToggleGroup
            value={mode}
            onChange={setMode}
            options={[
              { value: "units", label: "Units" },
              { value: "revenue", label: "Revenue" },
            ]}
          />
          <ToggleGroup
            value={tz}
            onChange={setTz}
            options={[
              { value: "local", label: "Local" },
              { value: "utc", label: "UTC" },
            ]}
          />
        </div>
      </header>

      <div className="overflow-x-auto">
        <div
          role="grid"
          aria-rowcount={8}
          aria-colcount={25}
          className="grid w-full min-w-[640px] gap-0.5 text-xs text-text-secondary"
          style={{
            gridTemplateColumns: "44px repeat(24, minmax(0, 1fr))",
          }}
        >
          <div role="columnheader" />
          {HOURS.map((h) => (
            <div
              key={`hh-${h}`}
              role="columnheader"
              className="pb-1 text-center text-[11px] tabular-nums"
            >
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </div>
          ))}
          {matrix.rows.map((day, d) => (
            <DayRow
              key={day}
              day={day}
              cells={matrix.cells[d]}
              max={matrix.maxIntensity}
              mode={mode}
              dayIdx={d}
              stops={stops}
              isHovered={(h) => hover?.d === d && hover.h === h}
              onHover={(h) => setHover({ d, h })}
              onLeave={() => setHover(null)}
            />
          ))}
        </div>
      </div>

      <CellTooltip cell={hovered} mode={mode} />

      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
        <span>0</span>
        <Legend key={theme} />
        <span>{mode === "units" ? matrix.maxIntensity.toLocaleString() : fmtGold(matrix.maxIntensity)}</span>
        <span className="ml-3 inline-flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-border-strong"
            style={{ background: "var(--surface)" }}
          />
          no data
        </span>
      </div>
    </section>
  );
}

function DayRow({
  day,
  cells,
  max,
  mode,
  dayIdx,
  stops,
  isHovered,
  onHover,
  onLeave,
}: {
  day: string;
  cells: ReturnType<typeof binToHeatmap>["cells"][number];
  max: number;
  mode: HeatmapMode;
  dayIdx: number;
  stops: string[];
  isHovered: (h: number) => boolean;
  onHover: (h: number) => void;
  onLeave: () => void;
}) {
  return (
    <>
      <div
        role="rowheader"
        className="flex items-center justify-end pr-3 text-right text-xs font-medium text-text-secondary"
      >
        {day}
      </div>
      {cells.map((cell, h) => {
        const intensity = mode === "units" ? cell.units : cell.goldValue;
        const bg = cellColor(intensity, max, stops);
        return (
          <button
            key={`${dayIdx}-${h}`}
            type="button"
            role="gridcell"
            aria-label={`${day} ${fmtHourRange(h)}: ${cell.units} units, ${fmtGold(cell.goldValue)}`}
            onMouseEnter={() => onHover(h)}
            onMouseLeave={onLeave}
            onFocus={() => onHover(h)}
            onBlur={onLeave}
            className={`h-12 w-full rounded-[3px] outline-none transition-shadow md:h-14 lg:h-16 ${
              isHovered(h) ? "ring-1 ring-white/70" : ""
            }`}
            style={{ background: bg }}
          />
        );
      })}
    </>
  );
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-md border border-border bg-background p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 transition-colors ${
            o.value === value
              ? "bg-border text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CellTooltip({
  cell,
  mode,
}: {
  cell: ReturnType<typeof binToHeatmap>["cells"][number][number] | null;
  mode: HeatmapMode;
}) {
  if (!cell) {
    return (
      <p className="mt-3 text-xs text-text-muted">
        Hover a cell for details.
      </p>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-border bg-background p-3 text-xs text-text-primary sm:grid-cols-4">
      <Stat label="When" value={`${cell.day} ${fmtHourRange(cell.hour)}`} />
      <Stat label="Units" value={cell.units.toLocaleString()} highlight={mode === "units"} />
      <Stat label="Revenue" value={fmtGold(cell.goldValue)} highlight={mode === "revenue"} />
      <Stat label="Sales" value={cell.events.toLocaleString()} />
      <Stat label="Median price" value={fmtGold(cell.medianPriceGold)} />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className={highlight ? "text-text-primary" : "text-text-secondary"}>
        {value}
      </span>
    </div>
  );
}

function Legend() {
  // Compose the gradient from the same CSS vars the heatmap cells read, so
  // the legend always matches the active theme.
  const gradient =
    "linear-gradient(to right, " +
    "var(--heatmap-0), var(--heatmap-1), var(--heatmap-2), var(--heatmap-3), " +
    "var(--heatmap-4), var(--heatmap-5), var(--heatmap-6), var(--heatmap-7), " +
    "var(--heatmap-8), var(--heatmap-9), var(--heatmap-10))";
  return (
    <div
      className="h-2 w-32 rounded-sm"
      style={{ background: gradient }}
    />
  );
}
