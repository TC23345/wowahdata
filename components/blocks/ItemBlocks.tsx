"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { ActiveElement } from "chart.js";
import { BlockShell, type ReadoutField } from "@/components/shell/BlockShell";
import { Segmented } from "@/components/shell/Segmented";
import { Money } from "@/components/ah/Money";
import { COLORS, ensureChartsRegistered } from "@/components/charts/chartjsSetup";
import { viridis } from "@/components/heatmap/colorScale";
import { buildScatterData, type ScatterPoint } from "@/lib/charts";
import { binToHeatmap } from "@/lib/heatmap";
import {
  bestListingWindows,
  cellConsistency,
  isAuction,
  listingSuccess,
  outcomesByBucket,
  priceRangeByBucket,
  spreadByBucket,
  sumCopper,
  sumUnits,
  type LedgerRow,
} from "@/lib/insights";
import { axisUnitFor, formatMoney } from "@/lib/money";
import { DAYS_TUE_FIRST, PRIMARY_CHROME, pad2, pct, slotLabel, tzLabel, units, type ViewProps } from "./types";

ensureChartsRegistered();

const SUNKEN = "var(--surface-sunken)";
const VIRIDIS_CSS = "linear-gradient(to right, rgb(68,1,84), rgb(64,67,135), rgb(41,120,142), rgb(34,167,132), rgb(189,222,38), rgb(253,231,36))";

function useItemSales(ctx: ViewProps["ctx"]) {
  return useMemo(() => ctx.itemSet.sales.filter(isAuction), [ctx.itemSet.sales]);
}

function useUnits168(ctx: ViewProps["ctx"]) {
  const sales = useItemSales(ctx);
  const cells = useMemo(() => binToHeatmap(sales, "units", ctx.tz).cells.flat(), [sales, ctx.tz]);
  return { sales, cells };
}

function noSales(ctx: ViewProps["ctx"]) {
  return { kind: "empty" as const, message: `No auction sales of ${ctx.item} in this range.` };
}

// ════════════════════════════════════════════════════════════════════════════
// Timing
// ════════════════════════════════════════════════════════════════════════════

type HeatMode = "units" | "revenue" | "consistency";

export function TimingHeatmapView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [mode, setMode] = useState<HeatMode>("units");
  const [hover, setHover] = useState<number | null>(null);
  const { sales, cells } = useUnits168(ctx);
  const cons = useMemo(() => cellConsistency(sales, ctx.tz, ctx.range), [sales, ctx.tz, ctx.range]);

  const values = cells.map((c, i) =>
    mode === "units" ? c.units : mode === "revenue" ? c.goldValue : cons.occurrences[i] ? cons.weeksActive[i] / cons.occurrences[i] : 0,
  );
  const max = Math.max(0, ...values);
  const totalUnits = sumUnits(sales);
  const zone = tzLabel(ctx.tz);
  const byDay = DAYS_TUE_FIRST.map((_, d) => cells.slice(d * 24, d * 24 + 24).reduce((s, c) => s + c.units, 0));
  const byHour = Array.from({ length: 24 }, (_, h) => byDay.reduce((s, _d, d) => s + cells[d * 24 + h].units, 0));
  const dayMax = Math.max(1, ...byDay);
  const hourMax = Math.max(1, ...byHour);

  const fields: ReadoutField[] | null =
    hover == null
      ? null
      : [
          { label: `When · ${zone}`, value: `${slotLabel(hover)}–${pad2(hover % 24)}:59` },
          { label: "Units", value: units(cells[hover].units) },
          { label: "Revenue", value: <Money copper={Math.round(cells[hover].goldValue * 10_000)} /> },
          { label: "Weeks with a sale", value: `${cons.weeksActive[hover]} of ${cons.occurrences[hover]}` },
          { label: "Sales", value: units(cells[hover].events) },
        ];

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={sales.length === 0 ? noSales(ctx) : { kind: "ready" }}
      summary={
        <>
          when your sales cleared · {units(totalUnits)} units · <Money copper={sumCopper(sales)} />
        </>
      }
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Colour cells by"
            value={mode}
            onChange={setMode}
            options={[
              { value: "units", label: "Units" },
              { value: "revenue", label: "Revenue" },
              { value: "consistency", label: "Consistency" },
            ]}
          />
        </>
      }
      readout={{ fields, idle: `Hover or focus a cell. Times in ${zone}; sale times come from sale mail and may trail the sale.` }}
      footer={
        <>
          <span>0</span>
          <span className="h-2 w-32 flex-none rounded-sm" style={{ background: VIRIDIS_CSS }} />
          <span>{mode === "units" ? `${units(max)} units` : mode === "revenue" ? formatMoney(Math.round(max * 10_000)) : pct(max)}</span>
          <span className="ml-3 inline-block h-2.5 w-2.5 flex-none rounded-sm border border-[#444]" style={{ background: SUNKEN }} />
          <span>no sales</span>
          <span className="ml-3 truncate">rows start on reset day</span>
        </>
      }
    >
      <div className="absolute inset-0 overflow-x-auto overflow-y-hidden px-3.5 pb-2 pt-1">
        <div
          role="grid"
          aria-label={`Sales by weekday and hour, ${zone}`}
          className="grid h-full min-w-[640px] gap-0.5 text-[11px] text-[#999]"
          style={{ gridTemplateColumns: "44px repeat(24, minmax(0, 1fr)) 84px", gridTemplateRows: "20px repeat(7, minmax(0, 1fr)) 40px" }}
          onMouseLeave={() => setHover(null)}
        >
          <div />
          {byHour.map((_, h) => (
            <div key={`h${h}`} className="text-center leading-5">
              {h % 3 === 0 ? pad2(h) : ""}
            </div>
          ))}
          <div className="text-right leading-5">share of week</div>
          {DAYS_TUE_FIRST.map((day, d) => (
            <div key={day} role="row" className="contents">
              <div className="flex items-center justify-end pr-2.5 text-xs font-semibold">{day}</div>
              {Array.from({ length: 24 }, (_, h) => {
                const i = d * 24 + h;
                const v = values[i];
                return (
                  <button
                    key={i}
                    type="button"
                    role="gridcell"
                    aria-label={`${slotLabel(i)}: ${cells[i].units} units`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="h-full w-full rounded-[3px] outline-none"
                    style={{ background: v > 0 && max > 0 ? viridis(v / max) : SUNKEN, boxShadow: hover === i ? "inset 0 0 0 1px #fff" : undefined }}
                  />
                );
              })}
              <div className="flex items-center gap-1.5 pl-1.5">
                <div className="h-2.5 flex-1 overflow-hidden rounded-sm" style={{ background: SUNKEN }}>
                  <div className="h-full bg-[#5dcaa5]" style={{ width: `${(100 * byDay[d]) / dayMax}%` }} />
                </div>
                <span className="w-8 text-right">{pct(totalUnits ? byDay[d] / totalUnits : 0)}</span>
              </div>
            </div>
          ))}
          <div className="flex items-end justify-end pr-2.5">by hour</div>
          {byHour.map((u, h) => (
            <div key={`m${h}`} className="flex items-end overflow-hidden rounded-sm" style={{ background: SUNKEN }}>
              <div className="w-full bg-[#5dcaa5]" style={{ height: `${(100 * u) / hourMax}%` }} />
            </div>
          ))}
          <div />
        </div>
      </div>
    </BlockShell>
  );
}

/** The week as 168 hourly bars, with the best window for each listing duration marked on it. */
export function TimingWindowsView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const { sales, cells } = useUnits168(ctx);
  const units168 = useMemo(() => cells.map((c) => c.units), [cells]);
  const windows = useMemo(() => bestListingWindows(units168, ctx.listingHours), [units168, ctx.listingHours]);
  const [active, setActive] = useState(1);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const zone = tzLabel(ctx.tz);
  const max = Math.max(1, ...units168);
  const w = windows[Math.min(active, windows.length - 1)];
  const inWindow = (i: number) => w && ((i - w.start + 168) % 168) < w.hours;

  const fields: ReadoutField[] | null =
    hoverSlot != null
      ? [
          { label: `When · ${zone}`, value: slotLabel(hoverSlot) },
          { label: "Units", value: units(units168[hoverSlot]) },
          { label: "In window", value: inWindow(hoverSlot) ? `${w.hours}h window` : "no" },
        ]
      : w
        ? [
            { label: `${w.hours}h window starts`, value: slotLabel(w.start) },
            { label: "Ends", value: slotLabel(w.start + w.hours) },
            { label: "Share of week", value: pct(w.share) },
            { label: "Units", value: units(w.units) },
          ]
        : null;

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={sales.length === 0 ? noSales(ctx) : { kind: "ready" }}
      summary={`best listing windows · starts in ${zone}`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Listing duration"
            value={String(active)}
            onChange={(v) => setActive(Number(v))}
            options={windows.map((win, i) => ({ value: String(i), label: `${win.hours}h` }))}
          />
        </>
      }
      readout={{ fields, idle: "" }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none bg-[#5dcaa5]" />
          <span>units per hour</span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none border border-[#e0e0e0] bg-[#e0e0e0]/10" />
          <span>best window for the chosen duration</span>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pb-2 pt-2">
        <div className="relative min-h-0 flex-1 border-b border-[#444]" onMouseLeave={() => setHoverSlot(null)}>
          <div className="absolute inset-0 grid items-end" style={{ gridTemplateColumns: "repeat(168, minmax(0, 1fr))" }}>
            {units168.map((u, i) => (
              <div
                key={i}
                className="relative h-full"
                onMouseEnter={() => setHoverSlot(i)}
                style={{ background: inWindow(i) ? "rgba(224,224,224,0.07)" : undefined, borderLeft: i % 24 === 0 && i > 0 ? "1px dashed #3a3a3a" : undefined }}
              >
                <div className="absolute inset-x-[1px] bottom-0" style={{ height: `${(100 * u) / max}%`, background: hoverSlot === i ? "#7fdab8" : "#5dcaa5" }} />
              </div>
            ))}
          </div>
        </div>
        <div className="grid h-5 flex-none text-[11px] leading-5 text-[#999]" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {DAYS_TUE_FIRST.map((d) => (
            <span key={d} className="pl-1">
              {d}
            </span>
          ))}
        </div>
        <ul className="mt-2 flex flex-none flex-col gap-1.5">
          {windows.map((win, i) => (
            <li key={win.hours}>
              <button
                type="button"
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={`grid h-8 w-full grid-cols-[44px_minmax(0,1fr)_minmax(0,2fr)_48px] items-center gap-3 rounded px-2 text-left ${i === active ? "bg-[#2c2c2c]" : ""}`}
              >
                <span className="text-[13px] font-semibold text-[#e0e0e0]">{win.hours}h</span>
                <span className="truncate text-xs text-[#999]">
                  {slotLabel(win.start)} → {slotLabel(win.start + win.hours)}
                </span>
                <span className="h-2 overflow-hidden rounded-sm" style={{ background: SUNKEN }}>
                  <span className="block h-full bg-[#5dcaa5]" style={{ width: `${win.share * 100}%` }} />
                </span>
                <span className="text-right text-[13px] font-semibold text-[#5dcaa5]">{pct(win.share)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </BlockShell>
  );
}

type DayFilter = "all" | "weekdays" | "weekend";
const WEEKEND = new Set([4, 5]); // Sat, Sun in a Tue-first week

/** The average day: units per hour, optionally weekdays or weekend only, with the peak eight hours shaded. */
export function TimingHoursView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [days, setDays] = useState<DayFilter>("all");
  const [hover, setHover] = useState<number | null>(null);
  const { sales, cells } = useUnits168(ctx);
  const cons = useMemo(() => cellConsistency(sales, ctx.tz, ctx.range), [sales, ctx.tz, ctx.range]);
  const keep = (d: number) => days === "all" || (days === "weekend" ? WEEKEND.has(d) : !WEEKEND.has(d));
  const perHour = Array.from({ length: 24 }, (_, h) => {
    let u = 0;
    let rev = 0;
    let occ = 0;
    for (let d = 0; d < 7; d++) {
      if (!keep(d)) continue;
      u += cells[d * 24 + h].units;
      rev += cells[d * 24 + h].goldValue;
      occ += cons.occurrences[d * 24 + h];
    }
    return { units: u, copper: Math.round(rev * 10_000), avg: occ ? u / occ : 0 };
  });
  const total = perHour.reduce((s, p) => s + p.units, 0);
  const max = Math.max(1e-9, ...perHour.map((p) => p.avg));
  let peak = 0;
  let best = -1;
  for (let s = 0; s < 24; s++) {
    let run = 0;
    for (let k = 0; k < 8; k++) run += perHour[(s + k) % 24].units;
    if (run > best) {
      best = run;
      peak = s;
    }
  }
  const inPeak = (h: number) => ((h - peak + 24) % 24) < 8;
  const zone = tzLabel(ctx.tz);
  const p = hover == null ? null : perHour[hover];

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={sales.length === 0 ? noSales(ctx) : { kind: "ready" }}
      summary={`the average day · peak 8 hours ${pad2(peak)}:00–${pad2((peak + 8) % 24)}:00 hold ${pct(total ? best / total : 0)}`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Days"
            value={days}
            onChange={setDays}
            options={[
              { value: "all", label: "All days" },
              { value: "weekdays", label: "Weekdays" },
              { value: "weekend", label: "Weekend" },
            ]}
          />
        </>
      }
      readout={{
        fields: p
          ? [
              { label: `Hour · ${zone}`, value: `${pad2(hover!)}:00–${pad2(hover!)}:59` },
              { label: "Units per day", value: p.avg.toFixed(p.avg >= 10 ? 0 : 1) },
              { label: "Share of day", value: pct(total ? p.units / total : 0) },
              { label: "Units", value: units(p.units) },
              { label: "Revenue", value: <Money copper={p.copper} /> },
            ]
          : null,
        idle: "Bars are average units sold in each hour on the selected days, so ragged ranges compare fairly.",
      }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none bg-[#5dcaa5]" />
          <span>peak 8 hours</span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none bg-[#3f6f60]" />
          <span>other hours</span>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pb-2 pt-3">
        <div className="grid min-h-0 flex-1 items-end gap-1 border-b border-[#444]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }} onMouseLeave={() => setHover(null)}>
          {perHour.map((ph, h) => (
            <div key={h} className="flex h-full items-end" onMouseEnter={() => setHover(h)} style={{ background: hover === h ? "#2c2c2c" : undefined }}>
              <div className="w-full rounded-t-sm" style={{ height: `${(100 * ph.avg) / max}%`, background: inPeak(h) ? "#5dcaa5" : "#3f6f60" }} />
            </div>
          ))}
        </div>
        <div className="grid h-5 flex-none text-center text-[11px] leading-5 text-[#999]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {perHour.map((_, h) => (
            <span key={h}>{h % 3 === 0 ? pad2(h) : ""}</span>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Price
// ════════════════════════════════════════════════════════════════════════════

type PriceWindow = "fit" | "middle" | "full";

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}

export function PriceTradesView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [win, setWin] = useState<PriceWindow>("fit");
  const [hover, setHover] = useState<ScatterPoint | null>(null);
  const buys = useMemo(() => ctx.itemSet.purchases.filter(isAuction), [ctx.itemSet.purchases]);
  const sells = useMemo(() => ctx.itemSet.sales.filter(isAuction), [ctx.itemSet.sales]);
  const data = useMemo(() => buildScatterData(buys, sells), [buys, sells]);
  const prices = useMemo(() => [...data.buys, ...data.sells].map((p) => p.y).sort((a, b) => a - b), [data]);
  const maxPrice = prices.length ? prices[prices.length - 1] : 1;
  const { unit, divisor } = axisUnitFor(maxPrice * 10_000);
  let lo = 0;
  let hi = maxPrice * 1.05;
  if (win === "fit" && prices.length) {
    const pad = (prices[prices.length - 1] - prices[0]) * 0.06 || prices[0] * 0.1;
    lo = Math.max(0, prices[0] - pad);
    hi = prices[prices.length - 1] + pad;
  } else if (win === "middle" && prices.length) {
    const a = quantile(prices, 0.05);
    const b = quantile(prices, 0.95);
    const pad = (b - a) * 0.08 || a * 0.1;
    lo = Math.max(0, a - pad);
    hi = b + pad;
  }

  const point = (p: ScatterPoint) => ({ x: p.x, y: p.y, r: p.r });
  const chartData = {
    datasets: [
      { type: "bubble" as const, label: "Bought", data: data.buys.map(point), backgroundColor: COLORS.buyMarkFill, borderColor: COLORS.buyMark, borderWidth: 1 },
      { type: "bubble" as const, label: "Sold", data: data.sells.map(point), backgroundColor: "transparent", borderColor: COLORS.sellMark, borderWidth: 2 },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    layout: { padding: { top: 6, right: 10 } },
    scales: {
      x: {
        type: "linear" as const,
        min: -0.6,
        max: Math.max(0.6, data.dayLabels.length - 0.4),
        afterFit: (axis: { height: number }) => {
          axis.height = 28;
        },
        ticks: {
          color: COLORS.text,
          maxTicksLimit: 12,
          maxRotation: 0,
          callback: (v: number | string) => {
            const n = Number(v);
            return Number.isInteger(n) ? (data.dayLabels[n] ?? "") : "";
          },
        },
        grid: { color: "#2a2a2a" },
      },
      y: {
        min: lo,
        max: hi,
        afterFit: (axis: { width: number }) => {
          axis.width = 64;
        },
        title: { display: true, text: `${unit === "g" ? "gold" : unit === "s" ? "silver" : "copper"} per unit`, color: COLORS.text },
        ticks: {
          color: COLORS.text,
          maxTicksLimit: 6,
          callback: (v: number | string) => {
            const value = (Number(v) * 10_000) / divisor;
            return value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2);
          },
        },
        grid: { color: "#2a2a2a" },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    onHover: (_e: unknown, els: ActiveElement[]) => {
      const el = els[0];
      if (!el) return setHover(null);
      setHover((el.datasetIndex === 0 ? data.buys : data.sells)[el.index] ?? null);
    },
  };

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={data.dayLabels.length === 0 ? { kind: "empty", message: `No auction buys or sells of ${ctx.item} in this range.` } : { kind: "ready" }}
      summary={`every trade · ${units(sumUnits(buys))} units bought · ${units(sumUnits(sells))} sold`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Price window"
            value={win}
            onChange={setWin}
            options={[
              { value: "fit", label: "Fit" },
              { value: "middle", label: "Middle 90%" },
              { value: "full", label: "Full" },
            ]}
          />
        </>
      }
      readout={{
        fields: hover
          ? [
              { label: "Day", value: hover.dayLabel },
              { label: "Side", value: hover.side === "buy" ? "Bought" : "Sold" },
              { label: "Price per unit", value: <Money copper={Math.round(hover.pricePerUnitGold * 10_000)} /> },
              { label: "Units", value: units(hover.qty) },
              { label: "Total", value: <Money copper={Math.round(hover.totalGold * 10_000)} /> },
            ]
          : null,
        idle: "Hover a mark. Filled = bought, ring = sold, one mark per trade; prices are per unit, as recorded.",
      }}
      footer={
        <>
          <BuySellLegend />
          <span className="ml-2.5 truncate">area ∝ units · buys left, sells right within each day</span>
        </>
      }
    >
      <div className="absolute inset-0 px-2 pb-1 pt-1">
        <Chart type="bubble" data={chartData} options={options} />
      </div>
    </BlockShell>
  );
}

function BuySellLegend({ buy = "bought", sell = "sold" }: { buy?: string; sell?: string }) {
  return (
    <>
      <span className="inline-block h-2.5 w-2.5 flex-none rounded-full border" style={{ background: COLORS.buyMarkFill, borderColor: COLORS.buyMark }} />
      <span>{buy}</span>
      <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none rounded-full border-2" style={{ borderColor: COLORS.sellMark }} />
      <span>{sell}</span>
    </>
  );
}

/** A copper price scale with three labelled ticks, shared by the bucketed price views. */
function priceScale(values: number[]) {
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = (max - min) * 0.12 || max * 0.05 || 1;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;
  return { lo, hi, y: (p: number) => 100 * (1 - (p - lo) / (hi - lo)), ticks: [hi, (hi + lo) / 2, lo] };
}

function PriceAxis({ ticks }: { ticks: number[] }) {
  return (
    <div className="relative w-16 flex-none text-[11px] text-[#999]">
      {ticks.map((p, i) => (
        <span key={i} className="absolute right-2 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(i * 100) / (ticks.length - 1)}%` }}>
          {formatMoney(Math.round(p))}
        </span>
      ))}
    </div>
  );
}

function BucketLabels({ labels }: { labels: string[] }) {
  return (
    <div className="ml-16 flex h-5 flex-none justify-between text-[11px] leading-5 text-[#999]">
      <span>{labels[0]}</span>
      {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
      <span>{labels[labels.length - 1]}</span>
    </div>
  );
}

export function PriceSpreadView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [hover, setHover] = useState<number | null>(null);
  const buckets = useMemo(() => spreadByBucket(ctx.itemSet, ctx.axis), [ctx.itemSet, ctx.axis]);
  const both = buckets.filter((b) => b.buy != null && b.sell != null);
  const scale = priceScale(buckets.flatMap((b) => [b.buy, b.sell]).filter((p): p is number => p != null));
  const spreadOf = (b: { buy: number | null; sell: number | null }) => (b.buy && b.sell ? b.sell / b.buy - 1 : null);
  const medianSpread = both.length ? [...both.map((b) => spreadOf(b)!)].sort((a, b) => a - b)[Math.floor(both.length / 2)] : null;
  const h = hover == null ? null : buckets[hover];

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={both.length === 0 ? { kind: "empty", message: `${ctx.item} needs both buys and sells in the same ${ctx.axis.bucket} to show a spread.` } : { kind: "ready" }}
      summary={`median buy → median sell per ${ctx.axis.bucket} · typical spread ${pct(medianSpread, 1)}`}
      toolbarLead={viewSwitch}
      readout={{
        fields: h
          ? [
              { label: ctx.axis.bucket === "day" ? "Day" : "Period", value: ctx.axis.labels[hover!] },
              { label: "Spread", value: pct(spreadOf(h), 1) },
              { label: "Median buy", value: h.buy ? <Money copper={h.buy} /> : "—" },
              { label: "Median sell", value: h.sell ? <Money copper={h.sell} /> : "—" },
              { label: "Units", value: `${units(h.buyUnits)} / ${units(h.sellUnits)}` },
            ]
          : null,
        idle: `Each bar joins one ${ctx.axis.bucket}'s median buy to its median sell, so drift between periods is not read as margin.`,
      }}
      footer={<BuySellLegend buy="median buy" sell="median sell" />}
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pb-1 pt-3">
        <div className="flex min-h-0 flex-1">
          <PriceAxis ticks={scale.ticks} />
          <div className="relative grid min-w-0 flex-1 border-b border-l border-[#444]" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
            {buckets.map((b, i) => (
              <div key={i} className="relative" onMouseEnter={() => setHover(i)} style={{ background: hover === i ? "#2c2c2c" : undefined }}>
                {b.buy != null && b.sell != null && (
                  <div
                    className="absolute left-1/2 w-0.5 -translate-x-1/2"
                    style={{ top: `${Math.min(scale.y(b.buy), scale.y(b.sell))}%`, height: `${Math.abs(scale.y(b.buy) - scale.y(b.sell))}%`, background: b.sell >= b.buy ? "#5dcaa5" : "#f07b7a" }}
                  />
                )}
                {b.buy != null && <div className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ top: `${scale.y(b.buy)}%`, background: COLORS.buyMark }} />}
                {b.sell != null && (
                  <div className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[#252525]" style={{ top: `${scale.y(b.sell)}%`, borderColor: COLORS.sellMark }} />
                )}
              </div>
            ))}
          </div>
        </div>
        <BucketLabels labels={ctx.axis.labels} />
      </div>
    </BlockShell>
  );
}

/** Per period, the middle half of what you paid and what you got, with the median marked. */
export function PriceRangeView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [hover, setHover] = useState<number | null>(null);
  const bands = useMemo(() => priceRangeByBucket(ctx.itemSet, ctx.axis), [ctx.itemSet, ctx.axis]);
  const values = bands.flatMap((b) => [b.buy?.p25, b.buy?.p75, b.sell?.p25, b.sell?.p75]).filter((p): p is number => p != null);
  const scale = priceScale(values);
  const h = hover == null ? null : bands[hover];
  const band = (b: NonNullable<(typeof bands)[number]["buy"]>, side: "buy" | "sell") => (
    <div
      className="absolute w-[34%] rounded-sm"
      style={{
        left: side === "buy" ? "12%" : "54%",
        top: `${scale.y(b.p75)}%`,
        height: `max(2px, ${scale.y(b.p25) - scale.y(b.p75)}%)`,
        background: side === "buy" ? COLORS.buyMarkFill : "rgba(169,162,242,0.18)",
        border: `1px solid ${side === "buy" ? COLORS.buyMark : COLORS.sellMark}`,
      }}
    >
      <div className="absolute inset-x-0 h-0.5 bg-[#e0e0e0]" style={{ top: `${((b.p75 - b.p50) / Math.max(1, b.p75 - b.p25)) * 100}%` }} />
    </div>
  );
  const range = (b: (typeof bands)[number]["buy"]) => (b ? `${formatMoney(b.p25)}–${formatMoney(b.p75)}` : "—");

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={values.length === 0 ? { kind: "empty", message: `No auction buys or sells of ${ctx.item} in this range.` } : { kind: "ready" }}
      summary={`middle half of prices per ${ctx.axis.bucket}, weighted by units`}
      toolbarLead={viewSwitch}
      readout={{
        fields: h
          ? [
              { label: ctx.axis.bucket === "day" ? "Day" : "Period", value: ctx.axis.labels[hover!] },
              { label: "Bought, middle half", value: range(h.buy) },
              { label: "Sold, middle half", value: range(h.sell) },
              { label: "Median buy", value: h.buy ? <Money copper={h.buy.p50} /> : "—" },
              { label: "Median sell", value: h.sell ? <Money copper={h.sell.p50} /> : "—" },
            ]
          : null,
        idle: "Boxes span the 25th to 75th percentile of unit prices; the line is the median. Overlapping boxes mean thin margins.",
      }}
      footer={
        <>
          <BuySellLegend />
          <span className="ml-2.5">box = middle half · line = median</span>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pb-1 pt-3">
        <div className="flex min-h-0 flex-1">
          <PriceAxis ticks={scale.ticks} />
          <div className="relative grid min-w-0 flex-1 border-b border-l border-[#444]" style={{ gridTemplateColumns: `repeat(${bands.length}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
            {bands.map((b, i) => (
              <div key={i} className="relative" onMouseEnter={() => setHover(i)} style={{ background: hover === i ? "#2c2c2c" : undefined }}>
                {b.buy && band(b.buy, "buy")}
                {b.sell && band(b.sell, "sell")}
              </div>
            ))}
          </div>
        </div>
        <BucketLabels labels={ctx.axis.labels} />
      </div>
    </BlockShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Listing outcomes
// ════════════════════════════════════════════════════════════════════════════

export function OutcomeLegend() {
  return (
    <>
      <span className="inline-block h-2.5 w-2.5 flex-none bg-[#5dcaa5]" />
      <span>sold</span>
      <span className="ml-2 inline-block h-2.5 w-2.5 flex-none bg-[#e24b4a]" />
      <span>canceled</span>
      <span className="hatch ml-2 inline-block h-2.5 w-2.5 flex-none border border-[#999]" />
      <span>expired</span>
    </>
  );
}

export function OutcomesTimeView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [measure, setMeasure] = useState<"units" | "share">("units");
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(() => outcomesByBucket(ctx.scopeSet, ctx.axis), [ctx.scopeSet, ctx.axis]);
  const max = Math.max(1, ...series.map((b) => b.sold + b.canceled + b.expired));
  const tot = series.reduce((s, b) => ({ sold: s.sold + b.sold, expired: s.expired + b.expired, canceled: s.canceled + b.canceled }), { sold: 0, expired: 0, canceled: 0 });
  const success = listingSuccess(tot.sold, tot.expired, tot.canceled);
  const h = hover == null ? null : series[hover];
  const scopeLabel = ctx.scope === "item" ? ctx.item : ctx.scope === "pipeline" ? "All conversions" : "All items";

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={success == null ? { kind: "empty", message: `No listing activity for ${scopeLabel} in this range.` } : { kind: "ready" }}
      summary={`${scopeLabel} · listing success ${pct(success)}`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Measure"
            value={measure}
            onChange={setMeasure}
            options={[
              { value: "units", label: "Units" },
              { value: "share", label: "Share" },
            ]}
          />
        </>
      }
      readout={{
        fields: h
          ? [
              { label: ctx.axis.bucket === "day" ? "Day" : "Period", value: ctx.axis.labels[hover!] },
              { label: "Listing success", value: pct(listingSuccess(h.sold, h.expired, h.canceled)) },
              { label: "Sold", value: units(h.sold) },
              { label: "Canceled", value: units(h.canceled) },
              { label: "Expired", value: units(h.expired) },
            ]
          : null,
        idle: "Units per listing attempt; relisted stock counts each time.",
      }}
      footer={<OutcomeLegend />}
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pt-2">
        <div className="grid min-h-0 flex-1 items-end gap-[3px] border-b border-[#444]" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
          {series.map((b, i) => {
            const t = b.sold + b.canceled + b.expired;
            const denom = measure === "share" ? Math.max(1, t) : max;
            return (
              <div key={i} className="flex h-full flex-col justify-end" onMouseEnter={() => setHover(i)} style={{ opacity: hover == null || hover === i ? 1 : 0.6 }}>
                <div className="hatch border border-b-0 border-[#999]" style={{ height: `${(100 * b.expired) / denom}%`, display: b.expired ? undefined : "none" }} />
                <div className="bg-[#e24b4a]" style={{ height: `${(100 * b.canceled) / denom}%` }} />
                <div className="bg-[#5dcaa5]" style={{ height: `${(100 * b.sold) / denom}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex h-[22px] flex-none justify-between text-[11px] leading-[22px] text-[#999]">
          <span>{ctx.axis.labels[0]}</span>
          <span>{ctx.axis.labels[ctx.axis.labels.length - 1]}</span>
        </div>
      </div>
    </BlockShell>
  );
}

export function OutcomesItemView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [sort, setSort] = useState<"revenue" | "canceled" | "expired">("revenue");
  const [hover, setHover] = useState<LedgerRow | null>(null);
  const rows = useMemo(() => {
    const listed = ctx.scopeLedger.filter((r) => r.soldUnits + r.expiredUnits + r.canceledUnits > 0);
    const key = sort === "revenue" ? (r: LedgerRow) => r.revenue : sort === "canceled" ? (r: LedgerRow) => r.canceledUnits : (r: LedgerRow) => r.expiredUnits;
    // Rank among revenue-bearing items, so the long tail stays out of the way.
    const top = [...listed].sort((a, b) => b.revenue - a.revenue).slice(0, 24);
    return top.sort((a, b) => key(b) - key(a)).slice(0, 8);
  }, [ctx.scopeLedger, sort]);
  const scopeLabel = ctx.scope === "pipeline" ? "All conversions" : "All items";

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={rows.length === 0 ? { kind: "empty", message: "No listing activity in this range." } : { kind: "ready" }}
      summary={`${scopeLabel} · top items by revenue`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "revenue", label: "Revenue" },
              { value: "canceled", label: "Canceled" },
              { value: "expired", label: "Expired" },
            ]}
          />
        </>
      }
      readout={{
        fields: hover
          ? [
              { label: "Item", value: hover.name },
              { label: "Listing success", value: pct(listingSuccess(hover.soldUnits, hover.expiredUnits, hover.canceledUnits)) },
              { label: "Sold", value: units(hover.soldUnits) },
              { label: "Canceled", value: units(hover.canceledUnits) },
              { label: "Expired", value: units(hover.expiredUnits) },
            ]
          : null,
        idle: "Share of listed units that sold, were canceled, or expired. Click a row to make it the active item.",
      }}
      footer={<OutcomeLegend />}
    >
      <ul className="flex h-full flex-col justify-evenly px-3.5" onMouseLeave={() => setHover(null)}>
        {rows.map((r) => {
          const t = r.soldUnits + r.canceledUnits + r.expiredUnits;
          return (
            <li
              key={r.name}
              className={`grid h-6 cursor-pointer grid-cols-[minmax(96px,168px)_minmax(0,1fr)_40px] items-center gap-2.5 rounded ${r.name === ctx.item ? "bg-[#1f2a26]" : ""}`}
              onMouseEnter={() => setHover(r)}
              onClick={() => ctx.selectItem(r.name)}
            >
              <span className="truncate pl-1 text-xs text-[#e0e0e0]">{r.name}</span>
              <div className="flex h-3.5 overflow-hidden rounded-sm">
                <div className="bg-[#5dcaa5]" style={{ width: `${(100 * r.soldUnits) / t}%` }} />
                <div className="bg-[#e24b4a]" style={{ width: `${(100 * r.canceledUnits) / t}%` }} />
                <div className="hatch border border-[#999]" style={{ width: `${(100 * r.expiredUnits) / t}%`, display: r.expiredUnits ? undefined : "none" }} />
              </div>
              <span className="text-right text-xs text-[#999]">{pct(r.soldUnits / t)}</span>
            </li>
          );
        })}
      </ul>
    </BlockShell>
  );
}
