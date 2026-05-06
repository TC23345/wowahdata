"use client";

import { useMemo, useState } from "react";
import type { PurchaseSaleRow } from "@/lib/csv";
import { binToHeatmap, type HeatmapMode, type HeatmapTz } from "@/lib/heatmap";
import { cellColor } from "./colorScale";

type Props = {
  rows: PurchaseSaleRow[];
  itemName: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtGold(g: number): string {
  if (g === 0) return "0g";
  if (g < 1) return `${(g * 100).toFixed(0)}s`;
  if (g < 100) return `${g.toFixed(2)}g`;
  if (g < 10_000) return `${g.toFixed(0)}g`;
  return `${(g / 1000).toFixed(1)}kg`;
}

function fmtHourRange(h: number): string {
  return `${String(h).padStart(2, "0")}:00–${String(h).padStart(2, "0")}:59`;
}

export function SaleHeatmap({ rows, itemName }: Props) {
  const [mode, setMode] = useState<HeatmapMode>("units");
  const [tz, setTz] = useState<HeatmapTz>("local");
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);

  const matrix = useMemo(() => binToHeatmap(rows, mode, tz), [rows, mode, tz]);

  const hovered = hover ? matrix.cells[hover.d][hover.h] : null;
  const tzLabel = tz === "local"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "local"
    : "UTC";

  return (
    <section
      aria-label={`Sale heatmap for ${itemName}`}
      className="rounded-lg border border-[#333] bg-[#252525] p-5"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#e0e0e0]">
            {itemName}
          </h2>
          <p className="text-xs text-[#999]">
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
          className="grid w-full min-w-[640px] gap-0.5 text-xs text-[#999]"
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
              isHovered={(h) => hover?.d === d && hover.h === h}
              onHover={(h) => setHover({ d, h })}
              onLeave={() => setHover(null)}
            />
          ))}
        </div>
      </div>

      <CellTooltip cell={hovered} mode={mode} />

      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#666]">
        <span>0</span>
        <Legend />
        <span>{mode === "units" ? matrix.maxIntensity.toLocaleString() : fmtGold(matrix.maxIntensity)}</span>
        <span className="ml-3 inline-flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-[#444]"
            style={{ background: "#252525" }}
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
  isHovered,
  onHover,
  onLeave,
}: {
  day: string;
  cells: ReturnType<typeof binToHeatmap>["cells"][number];
  max: number;
  mode: HeatmapMode;
  dayIdx: number;
  isHovered: (h: number) => boolean;
  onHover: (h: number) => void;
  onLeave: () => void;
}) {
  return (
    <>
      <div
        role="rowheader"
        className="flex items-center justify-end pr-3 text-right text-xs font-medium text-[#999]"
      >
        {day}
      </div>
      {cells.map((cell, h) => {
        const intensity = mode === "units" ? cell.units : cell.goldValue;
        const bg = cellColor(intensity, max);
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
            className={`aspect-[3/2] w-full rounded-[3px] outline-none transition-shadow md:aspect-[5/3] ${
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
      className="inline-flex rounded-md border border-[#333] bg-[#1a1a1a] p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 transition-colors ${
            o.value === value
              ? "bg-[#333] text-[#e0e0e0]"
              : "text-[#999] hover:text-[#e0e0e0]"
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
      <p className="mt-3 text-xs text-[#666]">
        Hover a cell for details.
      </p>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-[#333] bg-[#1a1a1a] p-3 text-xs text-[#e0e0e0] sm:grid-cols-4">
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
      <span className="text-[10px] uppercase tracking-wide text-[#666]">
        {label}
      </span>
      <span className={highlight ? "text-[#e0e0e0]" : "text-[#999]"}>
        {value}
      </span>
    </div>
  );
}

function Legend() {
  return (
    <div
      className="h-2 w-32 rounded-sm"
      style={{
        background:
          "linear-gradient(to right, rgb(68,1,84), rgb(64,67,135), rgb(41,120,142), rgb(34,167,132), rgb(189,222,38), rgb(253,231,36))",
      }}
    />
  );
}
