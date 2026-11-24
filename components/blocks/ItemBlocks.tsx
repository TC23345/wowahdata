"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { ActiveElement } from "chart.js";
import { BlockShell, type Chrome, type ReadoutField } from "@/components/shell/BlockShell";
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
  spreadByBucket,
  sumCopper,
  sumUnits,
} from "@/lib/insights";
import { axisUnitFor, formatMoney } from "@/lib/money";
import { DAYS_TUE_FIRST, pad2, pct, slotLabel, tzLabel, units, type BlockProps } from "./types";

ensureChartsRegistered();

const SUNKEN = "var(--surface-sunken)";

// ── timing-heatmap (XL) ──────────────────────────────────────────────────────

type HeatMode = "units" | "revenue" | "consistency";
export const HEATMAP_CHROME: Chrome = { toolbar: true, readout: true, footer: true };

export function TimingHeatmapBlock({ slot, ctx, stale }: BlockProps) {
  const [mode, setMode] = useState<HeatMode>("units");
  const [hover, setHover] = useState<number | null>(null);
  const sales = useMemo(() => ctx.itemSet.sales.filter(isAuction), [ctx.itemSet.sales]);
  const cells = useMemo(() => binToHeatmap(sales, "units", ctx.tz).cells.flat(), [sales, ctx.tz]);
  const cons = useMemo(() => cellConsistency(sales, ctx.tz, ctx.range), [sales, ctx.tz, ctx.range]);

  const values = cells.map((c, i) =>
    mode === "units" ? c.units : mode === "revenue" ? c.goldValue : cons.occurrences[i] ? cons.weeksActive[i] / cons.occurrences[i] : 0,
  );
  const max = Math.max(0, ...values);
  const totalUnits = sumUnits(sales);
  const totalCopper = sumCopper(sales);
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
      title="When your sales cleared"
      chrome={HEATMAP_CHROME}
      stale={stale}
      status={sales.length === 0 ? { kind: "empty", message: `No auction sales of ${ctx.item} in this range.` } : { kind: "ready" }}
      summary={
        <>
          {units(totalUnits)} units sold · <Money copper={totalCopper} />
        </>
      }
      toolbar={
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
      }
      readout={{
        fields,
        idle: `Hover or focus a cell. Times in ${zone}; sale times come from sale mail and may trail the sale.`,
      }}
      footer={
        <>
          <span>0</span>
          <span
            className="h-2 w-32 flex-none rounded-sm"
            style={{ background: "linear-gradient(to right, rgb(68,1,84), rgb(64,67,135), rgb(41,120,142), rgb(34,167,132), rgb(189,222,38), rgb(253,231,36))" }}
          />
          <span>
            {mode === "units" ? `${units(max)} units` : mode === "revenue" ? formatMoney(Math.round(max * 10_000)) : pct(max)}
          </span>
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
          style={{
            gridTemplateColumns: "44px repeat(24, minmax(0, 1fr)) 84px",
            gridTemplateRows: "20px repeat(7, minmax(0, 1fr)) 40px",
          }}
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
                    style={{
                      background: v > 0 && max > 0 ? viridis(v / max) : SUNKEN,
                      boxShadow: hover === i ? "inset 0 0 0 1px #fff" : undefined,
                    }}
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

// ── price-timeline (XL) ──────────────────────────────────────────────────────

type PriceWindow = "fit" | "middle" | "full";
export const PRICE_CHROME: Chrome = { toolbar: true, readout: true, footer: true };

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

export function PriceTimelineBlock({ slot, ctx, stale }: BlockProps) {
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
            return Number.isInteger(n) ? data.dayLabels[n] ?? "" : "";
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
      const src = el.datasetIndex === 0 ? data.buys : data.sells;
      setHover(src[el.index] ?? null);
    },
  };

  const fields: ReadoutField[] | null = hover
    ? [
        { label: "Day", value: hover.dayLabel },
        { label: "Side", value: hover.side === "buy" ? "Bought" : "Sold" },
        { label: "Price per unit", value: <Money copper={Math.round(hover.pricePerUnitGold * 10_000)} /> },
        { label: "Units", value: units(hover.qty) },
        { label: "Total", value: <Money copper={Math.round(hover.totalGold * 10_000)} /> },
      ]
    : null;

  return (
    <BlockShell
      slot={slot}
      title="Price over time"
      chrome={PRICE_CHROME}
      stale={stale}
      status={data.dayLabels.length === 0 ? { kind: "empty", message: `No auction buys or sells of ${ctx.item} in this range.` } : { kind: "ready" }}
      summary={`${units(sumUnits(buys))} units bought · ${units(sumUnits(sells))} sold`}
      toolbar={
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
      }
      readout={{ fields, idle: "Hover a mark. Filled = bought, ring = sold, one mark per trade; prices are per unit, as recorded." }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none rounded-full border" style={{ background: COLORS.buyMarkFill, borderColor: COLORS.buyMark }} />
          <span>bought</span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none rounded-full border-2" style={{ borderColor: COLORS.sellMark }} />
          <span>sold</span>
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

// ── post-windows (S) ─────────────────────────────────────────────────────────

export const WINDOWS_CHROME: Chrome = { toolbar: false, readout: true, footer: false };

export function PostWindowsBlock({ slot, ctx, stale }: BlockProps) {
  const [hover, setHover] = useState<number | null>(null);
  const sales = useMemo(() => ctx.itemSet.sales.filter(isAuction), [ctx.itemSet.sales]);
  const units168 = useMemo(() => binToHeatmap(sales, "units", ctx.tz).cells.flat().map((c) => c.units), [sales, ctx.tz]);
  const windows = useMemo(() => bestListingWindows(units168, ctx.listingHours), [units168, ctx.listingHours]);
  const zone = tzLabel(ctx.tz);
  const w = hover == null ? null : windows[hover];

  return (
    <BlockShell
      slot={slot}
      title="Best listing windows"
      chrome={WINDOWS_CHROME}
      stale={stale}
      status={sales.length === 0 ? { kind: "empty", message: `No auction sales of ${ctx.item} in this range.` } : { kind: "ready" }}
      summary={`starts in ${zone}`}
      readout={{
        fields: w
          ? [
              { label: `Starts · ${zone}`, value: slotLabel(w.start) },
              { label: "Share of week", value: pct(w.share) },
              { label: "Units", value: units(w.units) },
            ]
          : null,
        idle: "Share of your weekly units that sold inside each listing duration.",
      }}
    >
      <ul className="flex h-full flex-col justify-evenly px-3.5" onMouseLeave={() => setHover(null)}>
        {windows.map((win, i) => (
          <li key={win.hours} className="flex flex-col gap-1.5" onMouseEnter={() => setHover(i)}>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="w-11 flex-none text-[15px] font-semibold text-[#e0e0e0]">{win.hours}h</span>
              <span className="min-w-0 flex-1 truncate text-xs text-[#999]">
                {slotLabel(win.start)} → {slotLabel(win.start + win.hours)}
              </span>
              <span className="w-12 flex-none text-right text-[15px] font-semibold text-[#5dcaa5]">{pct(win.share)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-sm" style={{ background: SUNKEN }}>
              <div className="h-full bg-[#5dcaa5]" style={{ width: `${win.share * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

// ── spread (S) ───────────────────────────────────────────────────────────────

export const SPREAD_CHROME: Chrome = { toolbar: false, readout: true, footer: true };

export function SpreadBlock({ slot, ctx, stale }: BlockProps) {
  const [hover, setHover] = useState<number | null>(null);
  const buckets = useMemo(() => spreadByBucket(ctx.itemSet, ctx.axis), [ctx.itemSet, ctx.axis]);
  const both = buckets.filter((b) => b.buy != null && b.sell != null);
  const prices = buckets.flatMap((b) => [b.buy, b.sell]).filter((p): p is number => p != null);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 1;
  const pad = (max - min) * 0.12 || max * 0.05 || 1;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;
  const y = (p: number) => 100 * (1 - (p - lo) / (hi - lo));
  const h = hover == null ? null : buckets[hover];
  const spreadOf = (b: { buy: number | null; sell: number | null }) => (b.buy && b.sell ? b.sell / b.buy - 1 : null);

  return (
    <BlockShell
      slot={slot}
      title="Buy vs sell spread"
      chrome={SPREAD_CHROME}
      stale={stale}
      status={
        both.length === 0
          ? { kind: "empty", message: `${ctx.item} needs both buys and sells in the same ${ctx.axis.bucket} to show a spread.` }
          : { kind: "ready" }
      }
      summary={`median buy → median sell per ${ctx.axis.bucket}`}
      readout={{
        fields: h
          ? [
              { label: ctx.axis.bucket === "day" ? "Day" : "Bucket", value: ctx.axis.labels[hover!] },
              { label: "Spread", value: pct(spreadOf(h), 1) },
              { label: "Buy → sell", value: h.buy && h.sell ? `${formatMoney(h.buy)} → ${formatMoney(h.sell)}` : "—" },
            ]
          : null,
        idle: `Each bar joins one ${ctx.axis.bucket}'s median buy to its median sell.`,
      }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none rounded-full" style={{ background: COLORS.buyMark }} />
          <span>median buy</span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none rounded-full border-2" style={{ borderColor: COLORS.sellMark }} />
          <span>median sell</span>
        </>
      }
    >
      <div className="absolute inset-0 flex px-3.5 pb-2 pt-3">
        <div className="relative w-14 flex-none text-[11px] text-[#999]">
          {[hi, (hi + lo) / 2, lo].map((p, i) => (
            <span key={i} className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap" style={{ top: `${i * 50}%` }}>
              {formatMoney(Math.round(p))}
            </span>
          ))}
        </div>
        <div
          className="relative grid min-w-0 flex-1 border-b border-l border-[#444]"
          style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setHover(null)}
        >
          {buckets.map((b, i) => (
            <div key={i} className="relative" onMouseEnter={() => setHover(i)} style={{ background: hover === i ? "#2c2c2c" : undefined }}>
              {b.buy != null && b.sell != null && (
                <div
                  className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-[#777]"
                  style={{ top: `${Math.min(y(b.buy), y(b.sell))}%`, height: `${Math.abs(y(b.buy) - y(b.sell))}%` }}
                />
              )}
              {b.buy != null && (
                <div className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ top: `${y(b.buy)}%`, background: COLORS.buyMark }} />
              )}
              {b.sell != null && (
                <div
                  className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[#252525]"
                  style={{ top: `${y(b.sell)}%`, borderColor: COLORS.sellMark }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ── outcomes-trend (S) ───────────────────────────────────────────────────────

export const OUTCOMES_TREND_CHROME: Chrome = { toolbar: false, readout: true, footer: true };

export function OutcomeLegend() {
  return (
    <>
      <span className="inline-block h-2.5 w-2.5 flex-none bg-[#5dcaa5]" />
      <span>sold</span>
      <span className="ml-2 inline-block h-2.5 w-2.5 flex-none bg-[#e24b4a]" />
      <span>canceled</span>
      <span className="ml-2 inline-block h-2.5 w-2.5 flex-none border border-[#999] hatch" />
      <span>expired</span>
    </>
  );
}

export function OutcomesTrendBlock({ slot, ctx, stale }: BlockProps) {
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(() => outcomesByBucket(ctx.itemSet, ctx.axis), [ctx.itemSet, ctx.axis]);
  const max = Math.max(1, ...series.map((b) => b.sold + b.canceled + b.expired));
  const tot = series.reduce((s, b) => ({ sold: s.sold + b.sold, expired: s.expired + b.expired, canceled: s.canceled + b.canceled }), {
    sold: 0,
    expired: 0,
    canceled: 0,
  });
  const success = listingSuccess(tot.sold, tot.expired, tot.canceled);
  const h = hover == null ? null : series[hover];

  return (
    <BlockShell
      slot={slot}
      title="Listing outcomes"
      chrome={OUTCOMES_TREND_CHROME}
      stale={stale}
      status={success == null ? { kind: "empty", message: `No listing activity for ${ctx.item} in this range.` } : { kind: "ready" }}
      summary={`listing success ${pct(success)}`}
      readout={{
        fields: h
          ? [
              { label: ctx.axis.bucket === "day" ? "Day" : "Bucket", value: ctx.axis.labels[hover!] },
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
        <div
          className="grid min-h-0 flex-1 items-end gap-[3px] border-b border-[#444]"
          style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setHover(null)}
        >
          {series.map((b, i) => (
            <div key={i} className="flex h-full flex-col justify-end" onMouseEnter={() => setHover(i)} style={{ opacity: hover == null || hover === i ? 1 : 0.6 }}>
              <div className="hatch border border-b-0 border-[#999]" style={{ height: `${(100 * b.expired) / max}%`, display: b.expired ? undefined : "none" }} />
              <div className="bg-[#e24b4a]" style={{ height: `${(100 * b.canceled) / max}%` }} />
              <div className="bg-[#5dcaa5]" style={{ height: `${(100 * b.sold) / max}%` }} />
            </div>
          ))}
        </div>
        <div className="flex h-[22px] flex-none justify-between text-[11px] leading-[22px] text-[#999]">
          <span>{ctx.axis.labels[0]}</span>
          <span>{ctx.axis.labels[ctx.axis.labels.length - 1]}</span>
        </div>
      </div>
    </BlockShell>
  );
}
