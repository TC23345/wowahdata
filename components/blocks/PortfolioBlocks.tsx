"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { ActiveElement } from "chart.js";
import { BlockShell, type ReadoutField } from "@/components/shell/BlockShell";
import { Segmented } from "@/components/shell/Segmented";
import { Money } from "@/components/ah/Money";
import { AuctionTable, type Column } from "@/components/ah/AuctionTable";
import { COLORS, ensureChartsRegistered } from "@/components/charts/chartjsSetup";
import { cumulativeShares, feesSummary, flowByBucket, itemsForShare, listingSuccess, roleSummary, type LedgerRow, type Role } from "@/lib/insights";
import { axisUnitFor, formatMoney } from "@/lib/money";
import { PRIMARY_CHROME, pct, units, type ViewProps } from "./types";

ensureChartsRegistered();

const SUNKEN = "var(--surface-sunken)";

function scopeName(ctx: ViewProps["ctx"]): string {
  return ctx.scope === "item" ? ctx.item : ctx.scope === "pipeline" ? "All conversions" : "All items";
}

// ════════════════════════════════════════════════════════════════════════════
// Spend vs revenue
// ════════════════════════════════════════════════════════════════════════════

type FlowMode = "cumulative" | "bucket" | "net";

function FlowView({ slot, ctx, stale, viewSwitch, title, mode }: ViewProps & { mode: FlowMode }) {
  const [hover, setHover] = useState<number | null>(null);
  const flow = useMemo(() => flowByBucket(ctx.scopeSet, ctx.axis), [ctx.scopeSet, ctx.axis]);
  const last = flow[flow.length - 1];
  const net = flow.map((f) => f.revenue - f.spend);
  const cumNet = flow.map((f) => f.cumRevenue - f.cumSpend);
  const spend = flow.map((f) => (mode === "cumulative" ? f.cumSpend : f.spend));
  const revenue = flow.map((f) => (mode === "cumulative" ? f.cumRevenue : f.revenue));
  const magnitudes = mode === "net" ? [...net, ...cumNet].map(Math.abs) : [...spend, ...revenue];
  const { unit, divisor } = axisUnitFor(Math.max(1, ...magnitudes));
  const scaled = (xs: number[]) => xs.map((c) => c / divisor);

  const line = (data: number[], color: string, label: string, yAxisID = "y") => ({
    type: "line" as const,
    label,
    data: scaled(data),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 3,
    tension: 0.15,
    yAxisID,
  });
  const datasets =
    mode === "net"
      ? [
          {
            type: "bar" as const,
            label: "Net",
            data: scaled(net),
            backgroundColor: net.map((v) => (v >= 0 ? COLORS.profit : COLORS.loss)),
            yAxisID: "y",
          },
          line(cumNet, "#e0e0e0", "Running total"),
        ]
      : mode === "bucket"
        ? [
            { type: "bar" as const, label: "Spend", data: scaled(spend), backgroundColor: COLORS.buyMark, yAxisID: "y" },
            { type: "bar" as const, label: "Revenue", data: scaled(revenue), backgroundColor: COLORS.sellMark, yAxisID: "y" },
          ]
        : [line(spend, COLORS.buyMark, "Spend"), line(revenue, COLORS.sellMark, "Revenue")];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: { mode: "index" as const, intersect: false },
    layout: { padding: { top: 6, right: 10 } },
    scales: {
      x: {
        ticks: { color: COLORS.text, maxTicksLimit: 6, maxRotation: 0 },
        grid: { color: "#2a2a2a" },
        afterFit: (a: { height: number }) => {
          a.height = 26;
        },
      },
      y: {
        beginAtZero: true,
        ticks: { color: COLORS.text, maxTicksLimit: 5, callback: (v: number | string) => Number(v).toLocaleString("en-US") },
        title: { display: true, text: unit === "g" ? "gold" : unit === "s" ? "silver" : "copper", color: COLORS.text },
        grid: { color: "#2a2a2a" },
        afterFit: (a: { width: number }) => {
          a.width = 64;
        },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    onHover: (_e: unknown, els: ActiveElement[]) => setHover(els[0]?.index ?? null),
  };

  const f = hover == null ? null : flow[hover];
  const gap = last ? last.cumRevenue - last.cumSpend : 0;
  const positive = net.filter((v) => v > 0).length;
  const negative = net.filter((v) => v < 0).length;
  const period = ctx.axis.bucket === "day" ? "Day" : "Period";
  const fields: ReadoutField[] | null = f
    ? mode === "net"
      ? [
          { label: period, value: ctx.axis.labels[hover!] },
          { label: "Net", value: <Money copper={net[hover!]} sign="always" /> },
          { label: "Running total", value: <Money copper={cumNet[hover!]} sign="always" /> },
          { label: "Spend", value: <Money copper={f.spend} /> },
          { label: "Revenue", value: <Money copper={f.revenue} /> },
        ]
      : [
          { label: mode === "cumulative" ? "Through" : period, value: ctx.axis.labels[hover!] },
          { label: "Spend", value: <Money copper={spend[hover!]} /> },
          { label: "Revenue", value: <Money copper={revenue[hover!]} /> },
          { label: "Gap", value: <Money copper={revenue[hover!] - spend[hover!]} sign="always" /> },
        ]
    : null;

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={!last || (last.cumSpend === 0 && last.cumRevenue === 0) ? { kind: "empty", message: `No auction buys or sells for ${scopeName(ctx)} in this range.` } : { kind: "ready" }}
      summary={
        mode === "net" ? (
          `${scopeName(ctx)} · ${positive} up, ${negative} down`
        ) : (
          <>
            {scopeName(ctx)} · gap <Money copper={gap} sign="always" />
          </>
        )
      }
      toolbarLead={viewSwitch}
      readout={{
        fields,
        idle:
          mode === "net"
            ? `Revenue minus spend per ${ctx.axis.bucket}. Buy days and sell days alternate in a conversion business; the running total is the useful line.`
            : "Unsold stock is not counted, so a negative gap can be inventory, not loss.",
      }}
      footer={
        mode === "net" ? (
          <>
            <span className="inline-block h-2.5 w-2.5 flex-none bg-[#5dcaa5]" />
            <span>up</span>
            <span className="ml-2 inline-block h-2.5 w-2.5 flex-none bg-[#e24b4a]" />
            <span>down</span>
            <span className="ml-2 inline-block h-0.5 w-3 flex-none bg-[#e0e0e0]" />
            <span>running total</span>
          </>
        ) : (
          <>
            <span className="inline-block h-2.5 w-2.5 flex-none" style={{ background: COLORS.buyMark }} />
            <span>spend</span>
            <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none" style={{ background: COLORS.sellMark }} />
            <span>revenue</span>
            <span className="ml-2.5">auction rows only</span>
          </>
        )
      }
    >
      <div className="absolute inset-0 px-2 pb-1 pt-1">
        <Chart type="bar" data={{ labels: ctx.axis.labels, datasets }} options={options} />
      </div>
    </BlockShell>
  );
}

export const FlowCumulativeView = (p: ViewProps) => <FlowView {...p} mode="cumulative" />;
export const FlowBucketView = (p: ViewProps) => <FlowView {...p} mode="bucket" />;
export const FlowNetView = (p: ViewProps) => <FlowView {...p} mode="net" />;

// ════════════════════════════════════════════════════════════════════════════
// Pipeline
// ════════════════════════════════════════════════════════════════════════════

export function PipelineBalanceView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const p = ctx.pipeline;
  const [hover, setHover] = useState<{ side: "in" | "out"; i: number } | null>(null);
  const left = [...p.inputs, { name: `Other member items (${p.inputOther.count})`, copper: p.inputOther.copper, units: 0 }];
  const right = [...p.outputs, { name: `Other member items (${p.outputOther.count})`, copper: p.outputOther.copper, units: 0 }];
  const max = Math.max(1, ...left.map((r) => r.copper), ...right.map((r) => r.copper));
  const h = hover ? (hover.side === "in" ? left : right)[hover.i] : null;
  const sideTotal = hover?.side === "in" ? p.spend : p.revenue;

  const row = (r: (typeof left)[number], side: "in" | "out", i: number) => (
    <div
      key={r.name}
      className={`grid h-[26px] items-center gap-2 ${side === "in" ? "grid-cols-[minmax(0,1fr)_76px_50%]" : "grid-cols-[50%_76px_minmax(0,1fr)]"}`}
      onMouseEnter={() => setHover({ side, i })}
    >
      {side === "in" ? (
        <>
          <span className="truncate text-right text-xs text-[#e0e0e0]">{r.name}</span>
          <span className="text-right text-xs text-[#999]">{formatMoney(r.copper)}</span>
          <div className="flex h-3.5 justify-end">
            <div className="h-full rounded-l-sm" style={{ width: `${(100 * r.copper) / max}%`, background: COLORS.buyMark }} />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-3.5">
            <div className="h-full rounded-r-sm" style={{ width: `${(100 * r.copper) / max}%`, background: COLORS.sellMark }} />
          </div>
          <span className="text-xs text-[#999]">{formatMoney(r.copper)}</span>
          <span className="truncate text-xs text-[#e0e0e0]">{r.name}</span>
        </>
      )}
    </div>
  );

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={p.memberCount === 0 ? { kind: "empty", message: "No input or output items in this range." } : { kind: "ready" }}
      summary={`All conversions · ${units(p.memberCount)} member items, generated from buy and sell roles`}
      toolbarLead={viewSwitch}
      readout={{
        fields: h
          ? [
              { label: "Item", value: h.name },
              { label: "Side", value: hover!.side === "in" ? "Bought" : "Sold" },
              { label: "Gold", value: <Money copper={h.copper} /> },
              { label: "Share of side", value: pct(sideTotal ? h.copper / sideTotal : null) },
            ]
          : null,
        idle: "Left: what member items cost. Right: what they earned. The export does not link a purchase to what it became.",
      }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none" style={{ background: COLORS.buyMark }} />
          <span>
            bought <Money copper={p.spend} />
          </span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none" style={{ background: COLORS.sellMark }} />
          <span>
            sold <Money copper={p.revenue} />
          </span>
          <span className="ml-2.5">auction rows only</span>
        </>
      }
    >
      <div className="absolute inset-0 grid grid-cols-[minmax(0,1fr)_132px_minmax(0,1fr)] px-3.5 py-1" onMouseLeave={() => setHover(null)}>
        <div className="flex min-w-0 flex-col justify-evenly">{left.map((r, i) => row(r, "in", i))}</div>
        <div className="flex flex-col items-center justify-center gap-1 border-x border-[#444] px-2 text-center">
          <span className="text-[10px] uppercase tracking-wide text-[#999]">sold − bought</span>
          <span className="whitespace-nowrap text-lg font-semibold text-[#e0e0e0]">
            <Money copper={p.margin} />
          </span>
          <span className="text-[10px] leading-[13px] text-[#999]">stock on hand is not counted</span>
        </div>
        <div className="flex min-w-0 flex-col justify-evenly">{right.map((r, i) => row(r, "out", i))}</div>
      </div>
    </BlockShell>
  );
}

const ROLE_COPY: Record<Role, { label: string; note: string }> = {
  input: { label: "Inputs", note: "bought to convert, rarely resold" },
  output: { label: "Outputs", note: "sold mostly from your own supply" },
  flip: { label: "Flips", note: "bought and resold" },
};

/** The whole business by role: how much went into inputs, came out of outputs, and turned over in flips. */
export function PipelineRolesView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const roles = useMemo(() => roleSummary(ctx.ledger), [ctx.ledger]);
  const [hover, setHover] = useState<Role | null>(null);
  const max = Math.max(1, ...roles.flatMap((r) => [r.spend, r.revenue]));
  const h = roles.find((r) => r.role === hover) ?? null;

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={ctx.ledger.length === 0 ? { kind: "empty", message: "No auction activity in this range." } : { kind: "ready" }}
      summary="every traded item, by role · roles computed over all time"
      toolbarLead={viewSwitch}
      readout={{
        fields: h
          ? [
              { label: "Role", value: ROLE_COPY[h.role].label },
              { label: "Items", value: units(h.items) },
              { label: "Spend", value: <Money copper={h.spend} /> },
              { label: "Revenue", value: <Money copper={h.revenue} /> },
              { label: "Revenue − spend", value: <Money copper={h.revenue - h.spend} sign="always" /> },
            ]
          : null,
        idle: "Inputs and outputs together are the conversion business; flips are the only place a per-item margin means something.",
      }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none" style={{ background: COLORS.buyMark }} />
          <span>spend</span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none" style={{ background: COLORS.sellMark }} />
          <span>revenue</span>
          <span className="ml-2.5">auction rows only</span>
        </>
      }
    >
      <ul className="flex h-full flex-col justify-evenly px-3.5" onMouseLeave={() => setHover(null)}>
        {roles.map((r) => (
          <li
            key={r.role}
            className={`grid grid-cols-[minmax(120px,200px)_minmax(0,1fr)] items-center gap-4 rounded px-2 py-1.5 ${hover === r.role ? "bg-[#2c2c2c]" : ""}`}
            onMouseEnter={() => setHover(r.role)}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#e0e0e0]">
                {ROLE_COPY[r.role].label} <span className="font-normal text-[#999]">· {units(r.items)} items</span>
              </p>
              <p className="truncate text-[11px] text-[#999]">{ROLE_COPY[r.role].note}</p>
            </div>
            <div className="flex flex-col gap-1">
              {(["spend", "revenue"] as const).map((k) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2">
                  <div className="h-3 overflow-hidden rounded-sm" style={{ background: SUNKEN }}>
                    <div className="h-full" style={{ width: `${(100 * r[k]) / max}%`, background: k === "spend" ? COLORS.buyMark : COLORS.sellMark }} />
                  </div>
                  <span className="text-right text-xs text-[#999]">{formatMoney(r[k])}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Items
// ════════════════════════════════════════════════════════════════════════════

function dateLabel(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

/** The auction-house browse list, for your own trades. */
export function ItemsTableView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [role, setRole] = useState<Role | "all">("all");
  const [filter, setFilter] = useState("");
  const [hover, setHover] = useState<LedgerRow | null>(null);
  const totalRevenue = useMemo(() => ctx.ledger.reduce((s, r) => s + r.revenue, 0), [ctx.ledger]);
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return ctx.ledger.filter((r) => (role === "all" || r.role === role) && (!q || r.name.toLowerCase().includes(q)));
  }, [ctx.ledger, role, filter]);
  const k80 = useMemo(() => itemsForShare(ctx.ledger, 0.8), [ctx.ledger]);

  const pinned = new Set(ctx.pins);
  const columns: Column<LedgerRow>[] = [
    {
      id: "pin",
      header: "",
      width: 34,
      padLeft: 6,
      padRight: 0,
      render: (r) => {
        const on = pinned.has(r.name);
        return (
          <button
            type="button"
            aria-pressed={on}
            aria-label={on ? `Unpin ${r.name}` : `Pin ${r.name}`}
            title={on ? "Pinned: shown in the quick row. Click to unpin." : "Pin to the quick row (or right-click the row)."}
            onClick={(e) => {
              e.stopPropagation();
              ctx.togglePin(r.name);
            }}
            className={`text-sm leading-none ${on ? "text-[#ffd100]" : "text-[#555] hover:text-[#999]"}`}
          >
            {on ? "★" : "☆"}
          </button>
        );
      },
    },
    { id: "name", header: "Item", fill: 2.4, minWidth: 200, sortValue: (r) => r.name, titleOf: (r) => r.name, render: (r) => r.name },
    { id: "role", header: "Role", width: 72, sortValue: (r) => r.role, render: (r) => <span className="text-[#999]">{r.role}</span> },
    { id: "sold", header: "Sold", width: 84, align: "right", sortValue: (r) => r.soldUnits, render: (r) => units(r.soldUnits) },
    { id: "revenue", header: "Revenue", width: 128, align: "right", sortValue: (r) => r.revenue, render: (r) => <Money copper={r.revenue} align /> },
    { id: "share", header: "Share", width: 72, align: "right", sortValue: (r) => r.revenue, render: (r) => <span className="text-[#999]">{pct(totalRevenue ? r.revenue / totalRevenue : 0, 1)}</span> },
    { id: "bought", header: "Bought", width: 84, align: "right", sortValue: (r) => r.boughtUnits, render: (r) => (r.boughtUnits ? units(r.boughtUnits) : "—") },
    { id: "spend", header: "Spend", width: 128, align: "right", sortValue: (r) => r.spend, render: (r) => (r.spend ? <Money copper={r.spend} align /> : "—") },
    {
      id: "avg",
      header: "Avg sell",
      width: 110,
      align: "right",
      sortValue: (r) => (r.soldUnits ? r.revenue / r.soldUnits : 0),
      render: (r) => (r.soldUnits ? <Money copper={Math.round(r.revenue / r.soldUnits)} align /> : "—"),
    },
    {
      id: "success",
      header: "Listed → sold",
      width: 110,
      align: "right",
      sortValue: (r) => listingSuccess(r.soldUnits, r.expiredUnits, r.canceledUnits) ?? -1,
      render: (r) => <span className="text-[#999]">{pct(listingSuccess(r.soldUnits, r.expiredUnits, r.canceledUnits))}</span>,
    },
  ];

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={ctx.ledger.length === 0 ? { kind: "empty", message: "No auction activity in this range." } : { kind: "ready" }}
      summary={`${units(ctx.ledger.length)} items · ${k80} carry 80% of revenue`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: "all", label: "All" },
              { value: "output", label: "Outputs" },
              { value: "input", label: "Inputs" },
              { value: "flip", label: "Flips" },
            ]}
          />
          <label className="flex flex-none items-center gap-1.5 text-xs text-[#999]">
            <span className="sr-only">Filter items</span>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter items"
              className="h-[26px] w-40 rounded-md border border-[#333] bg-[#1a1a1a] px-2 text-xs text-[#e0e0e0] outline-none focus:border-[#666]"
            />
          </label>
        </>
      }
      readout={{
        fields: hover
          ? [
              { label: "Item", value: hover.name },
              { label: "Avg sell", value: hover.soldUnits ? <Money copper={Math.round(hover.revenue / hover.soldUnits)} /> : "—" },
              { label: "Avg buy", value: hover.boughtUnits ? <Money copper={Math.round(hover.spend / hover.boughtUnits)} /> : "—" },
              { label: "First seen", value: dateLabel(hover.firstSeen) },
              { label: "Last seen", value: dateLabel(hover.lastSeen) },
            ]
          : null,
        idle: "Click a row to make it the active item; ☆ or right-click pins it to the quick row. Click two headers to sort by one, then the other.",
      }}
      footer={<span>{rows.length === ctx.ledger.length ? `${units(rows.length)} items · auction rows only` : `${units(rows.length)} of ${units(ctx.ledger.length)} items shown`}</span>}
    >
      <div className="absolute inset-x-3.5 bottom-2 top-0 overflow-hidden rounded border border-[#333]">
        {rows.length === 0 ? (
          <p className="flex h-full items-center justify-center text-[13px] text-[#999]">No items match.</p>
        ) : (
          <AuctionTable
            label="Items traded"
            rows={rows}
            columns={columns}
            rowKey={(r) => r.name}
            initialSort={[{ id: "revenue", dir: "desc" }]}
            storageKey="items-table"
            selectedKey={ctx.item}
            onSelect={(r) => ctx.selectItem(r.name)}
            onHover={setHover}
            onRowContextMenu={(r) => ctx.togglePin(r.name)}
          />
        )}
      </div>
    </BlockShell>
  );
}

const RANKS = 40;

export function ItemsConcentrationView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const [key, setKey] = useState<"revenue" | "spend">("revenue");
  const [hover, setHover] = useState<number | null>(null);
  const shares = useMemo(() => cumulativeShares(ctx.ledger, RANKS, key), [ctx.ledger, key]);
  const ranked = useMemo(() => [...ctx.ledger].sort((a, b) => b[key] - a[key]).slice(0, RANKS), [ctx.ledger, key]);
  const total = useMemo(() => ctx.ledger.reduce((s, r) => s + r[key], 0), [ctx.ledger, key]);
  const k = useMemo(() => itemsForShare(ctx.ledger, 0.8, key), [ctx.ledger, key]);
  const n = ctx.ledger.filter((r) => r[key] > 0).length;
  const r = hover == null ? null : ranked[hover];

  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={n === 0 ? { kind: "empty", message: "No auction activity in this range." } : { kind: "ready" }}
      summary={`${k} of ${units(n)} items make 80% of ${key}`}
      toolbarLead={viewSwitch}
      toolbar={
        <>
          <Segmented
            label="Measure"
            value={key}
            onChange={setKey}
            options={[
              { value: "revenue", label: "Revenue" },
              { value: "spend", label: "Spend" },
            ]}
          />
        </>
      }
      readout={{
        fields: r
          ? [
              { label: "Rank", value: String(hover! + 1) },
              { label: "Item", value: r.name },
              { label: key === "revenue" ? "Revenue" : "Spend", value: <Money copper={r[key]} /> },
              { label: "Share", value: pct(total ? r[key] / total : 0, 1) },
              { label: "Cumulative", value: pct(shares[hover!]) },
            ]
          : null,
        idle: `Top ${RANKS} items by ${key}, cumulative share. The dashed line marks 80%. Click a bar to make it the active item.`,
      }}
      footer={
        <>
          <span className="inline-block h-2.5 w-2.5 flex-none bg-[#5dcaa5]" />
          <span>items inside 80%</span>
          <span className="ml-2.5 inline-block h-2.5 w-2.5 flex-none bg-[#3f6f60]" />
          <span>the rest</span>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pt-3">
        <div className="relative min-h-0 flex-1 border-b border-l border-[#444]" onMouseLeave={() => setHover(null)}>
          <div className="absolute inset-0 grid items-end gap-px" style={{ gridTemplateColumns: `repeat(${RANKS}, minmax(0, 1fr))` }}>
            {Array.from({ length: RANKS }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={ranked[i]?.name ?? `rank ${i + 1}`}
                className="flex h-full items-end"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => ranked[i] && ctx.selectItem(ranked[i].name)}
                style={{ background: hover === i ? "#2c2c2c" : undefined }}
              >
                <span className="block w-full" style={{ height: `${(shares[i] ?? 0) * 100}%`, background: i < k ? "#5dcaa5" : "#3f6f60" }} />
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-[20%] border-t border-dashed border-[#e0e0e0]" />
          <span className="pointer-events-none absolute right-1 top-[20%] mt-0.5 text-[11px] text-[#e0e0e0]">80%</span>
        </div>
        <div className="flex h-[22px] flex-none justify-between text-[11px] leading-[22px] text-[#999]">
          <span>rank 1</span>
          <span>rank {RANKS}</span>
        </div>
      </div>
    </BlockShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Costs
// ════════════════════════════════════════════════════════════════════════════

export function CostsFeesView({ slot, ctx, stale, viewSwitch, title }: ViewProps) {
  const f = useMemo(() => feesSummary(ctx.rangeSet.income, ctx.rangeSet.expenses, ctx.ownChars), [ctx.rangeSet.income, ctx.rangeSet.expenses, ctx.ownChars]);
  const revenue = ctx.ledger.reduce((s, r) => s + r.revenue, 0);
  const hasLedger = ctx.data.income.length + ctx.data.expenses.length > 0;
  const line = (label: string, sub: string, copper: number, muted?: boolean) => (
    <div key={label} className={`flex h-8 items-center justify-between gap-2 border-b border-[#333] ${muted ? "text-xs text-[#999]" : "text-[13px] text-[#e0e0e0]"}`}>
      <span className="truncate">{label}</span>
      <span className="flex-none text-xs text-[#999]">{sub}</span>
      <span className="w-24 flex-none text-right">
        <Money copper={copper} />
      </span>
    </div>
  );
  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      status={hasLedger ? { kind: "ready" } : { kind: "unavailable", message: "Needs the income and expenses files from the export." }}
      summary={
        <>
          fees and upkeep · <Money copper={f.total} /> · {pct(revenue ? f.total / revenue : null, 2)} of revenue
        </>
      }
      toolbarLead={viewSwitch}
      readout={{ fields: null, idle: "Postage, repairs and other costs from the expenses file. Gold moved between characters is not a cost." }}
      footer={<span>from the income and expenses files</span>}
    >
      <div className="flex h-full flex-col justify-center px-3.5">
        {f.categories.slice(0, 3).map((c) => line(c.type, `${units(c.entries)} entries`, c.copper))}
        <div className="flex h-8 items-center justify-between text-[13px] font-semibold text-[#e0e0e0]">
          <span>Total</span>
          <span className="w-24 text-right">
            <Money copper={f.total} />
          </span>
        </div>
        <p className="mt-3 text-[10px] uppercase tracking-wide text-[#999]">Money transfers · not counted</p>
        {line("Own characters", "sent", f.transfersOwn.sent, true)}
        {line("Other characters", "sent", f.transfersOther.sent, true)}
      </div>
    </BlockShell>
  );
}

export function CostsHousesView({ slot, stale, viewSwitch, title }: ViewProps) {
  return (
    <BlockShell
      slot={slot}
      title={title}
      chrome={PRIMARY_CHROME}
      stale={stale}
      toolbarLead={viewSwitch}
      status={{
        kind: "unavailable",
        message:
          "This dataset has one auction house. On a Forever dataset, assign each character a faction to split revenue between the Alliance, Horde and Blackwater houses, where the cut is 15%.",
      }}
    />
  );
}
