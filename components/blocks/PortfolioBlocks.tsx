"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { ActiveElement } from "chart.js";
import { BlockShell, type Chrome, type ReadoutField } from "@/components/shell/BlockShell";
import { Segmented } from "@/components/shell/Segmented";
import { Money } from "@/components/ah/Money";
import { AuctionTable, type Column } from "@/components/ah/AuctionTable";
import { COLORS, ensureChartsRegistered } from "@/components/charts/chartjsSetup";
import {
  cumulativeShares,
  feesSummary,
  flowByBucket,
  itemsForShare,
  listingSuccess,
  type LedgerRow,
  type Role,
} from "@/lib/insights";
import { axisUnitFor, formatMoney } from "@/lib/money";
import { OutcomeLegend } from "./ItemBlocks";
import { pct, units, type BlockProps } from "./types";

ensureChartsRegistered();

function scopeName(ctx: BlockProps["ctx"]): string {
  return ctx.workspace.id === "pipeline" ? "All conversions" : "All items";
}

// ── pipeline-balance (L) ─────────────────────────────────────────────────────

export const PIPELINE_CHROME: Chrome = { toolbar: false, readout: true, footer: true };

export function PipelineBalanceBlock({ slot, ctx, stale }: BlockProps) {
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
      title="Inputs and outputs"
      chrome={PIPELINE_CHROME}
      stale={stale}
      status={p.memberCount === 0 ? { kind: "empty", message: "No input or output items in this range." } : { kind: "ready" }}
      summary={`All conversions · ${units(p.memberCount)} member items, generated from buy and sell roles`}
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
        <div className="flex min-w-0 flex-col justify-evenly">
          {left.map((r, i) => (
            row(r, "in", i)
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-1 border-x border-[#444] px-2 text-center">
          <span className="text-[10px] uppercase tracking-wide text-[#999]">sold − bought</span>
          <span className="whitespace-nowrap text-lg font-semibold text-[#e0e0e0]">
            <Money copper={p.margin} />
          </span>
          <span className="text-[10px] leading-[13px] text-[#999]">stock on hand is not counted</span>
        </div>
        <div className="flex min-w-0 flex-col justify-evenly">
          {right.map((r, i) => (
            row(r, "out", i)
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ── cumulative-flow (M) ──────────────────────────────────────────────────────

export const FLOW_CHROME: Chrome = { toolbar: true, readout: true, footer: true };

export function CumulativeFlowBlock({ slot, ctx, stale }: BlockProps) {
  const [mode, setMode] = useState<"cumulative" | "bucket">("cumulative");
  const [hover, setHover] = useState<number | null>(null);
  const flow = useMemo(() => flowByBucket(ctx.scopeSet, ctx.axis), [ctx.scopeSet, ctx.axis]);
  const last = flow[flow.length - 1];
  const spend = flow.map((f) => (mode === "cumulative" ? f.cumSpend : f.spend));
  const revenue = flow.map((f) => (mode === "cumulative" ? f.cumRevenue : f.revenue));
  const { unit, divisor } = axisUnitFor(Math.max(1, ...spend, ...revenue));
  const line = (data: number[], color: string, label: string) => ({
    type: "line" as const,
    label,
    data: data.map((c) => c / divisor),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 3,
    tension: 0.15,
  });
  const chartData = { labels: ctx.axis.labels, datasets: [line(spend, COLORS.buyMark, "Spend"), line(revenue, COLORS.sellMark, "Revenue")] };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: { mode: "index" as const, intersect: false },
    layout: { padding: { top: 6, right: 10 } },
    scales: {
      x: { ticks: { color: COLORS.text, maxTicksLimit: 6, maxRotation: 0 }, grid: { color: "#2a2a2a" }, afterFit: (a: { height: number }) => { a.height = 26; } },
      y: {
        beginAtZero: true,
        ticks: { color: COLORS.text, maxTicksLimit: 5, callback: (v: number | string) => Number(v).toLocaleString("en-US") },
        title: { display: true, text: unit === "g" ? "gold" : unit === "s" ? "silver" : "copper", color: COLORS.text },
        grid: { color: "#2a2a2a" },
        afterFit: (a: { width: number }) => { a.width = 64; },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    onHover: (_e: unknown, els: ActiveElement[]) => setHover(els[0]?.index ?? null),
  };
  const f = hover == null ? null : flow[hover];
  const gap = last ? last.cumRevenue - last.cumSpend : 0;

  return (
    <BlockShell
      slot={slot}
      title="Spend vs revenue"
      chrome={FLOW_CHROME}
      stale={stale}
      status={!last || (last.cumSpend === 0 && last.cumRevenue === 0) ? { kind: "empty", message: "No auction buys or sells in this range." } : { kind: "ready" }}
      summary={
        <>
          {scopeName(ctx)} · gap <Money copper={gap} sign="always" />
        </>
      }
      toolbar={
        <Segmented
          label="Show"
          value={mode}
          onChange={setMode}
          options={[
            { value: "cumulative", label: "Cumulative" },
            { value: "bucket", label: `Per ${ctx.axis.bucket}` },
          ]}
        />
      }
      readout={{
        fields: f
          ? [
              { label: "Through", value: ctx.axis.labels[hover!] },
              { label: "Spend", value: <Money copper={mode === "cumulative" ? f.cumSpend : f.spend} /> },
              { label: "Revenue", value: <Money copper={mode === "cumulative" ? f.cumRevenue : f.revenue} /> },
              { label: "Gap", value: <Money copper={mode === "cumulative" ? f.cumRevenue - f.cumSpend : f.revenue - f.spend} sign="always" /> },
            ]
          : null,
        idle: "Unsold stock is not counted, so a negative gap can be inventory, not loss.",
      }}
      footer={
        <>
          <span className="inline-block h-0.5 w-3 flex-none" style={{ background: COLORS.buyMark }} />
          <span>spend</span>
          <span className="ml-2.5 inline-block h-0.5 w-3 flex-none" style={{ background: COLORS.sellMark }} />
          <span>revenue</span>
          <span className="ml-2.5">auction rows only</span>
        </>
      }
    >
      <div className="absolute inset-0 px-2 pb-1 pt-1">
        <Chart type="line" data={chartData} options={options} />
      </div>
    </BlockShell>
  );
}

// ── outcomes-by-item (M) ─────────────────────────────────────────────────────

export const OUTCOMES_ITEM_CHROME: Chrome = { toolbar: true, readout: true, footer: true };

export function OutcomesByItemBlock({ slot, ctx, stale }: BlockProps) {
  const [sort, setSort] = useState<"revenue" | "canceled" | "expired">("revenue");
  const [hover, setHover] = useState<LedgerRow | null>(null);
  const rows = useMemo(() => {
    const listed = ctx.scopeLedger.filter((r) => r.soldUnits + r.expiredUnits + r.canceledUnits > 0);
    const key = sort === "revenue" ? (r: LedgerRow) => r.revenue : sort === "canceled" ? (r: LedgerRow) => r.canceledUnits : (r: LedgerRow) => r.expiredUnits;
    // Rank among revenue-bearing items, so the long tail stays out of the way.
    const top = [...listed].sort((a, b) => b.revenue - a.revenue).slice(0, 24);
    return top.sort((a, b) => key(b) - key(a)).slice(0, 8);
  }, [ctx.scopeLedger, sort]);

  return (
    <BlockShell
      slot={slot}
      title="Outcomes by item"
      chrome={OUTCOMES_ITEM_CHROME}
      stale={stale}
      status={rows.length === 0 ? { kind: "empty", message: "No listing activity in this range." } : { kind: "ready" }}
      summary={`${scopeName(ctx)} · top items by revenue`}
      toolbar={
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
      }
      readout={{
        fields: hover
          ? [
              { label: "Item", value: hover.name },
              { label: "Listing success", value: pct(listingSuccess(hover.soldUnits, hover.expiredUnits, hover.canceledUnits)) },
              { label: "Canceled", value: units(hover.canceledUnits) },
              { label: "Expired", value: units(hover.expiredUnits) },
            ]
          : null,
        idle: "Share of listed units that sold, were canceled, or expired. Right: listing success.",
      }}
      footer={<OutcomeLegend />}
    >
      <ul className="flex h-full flex-col justify-evenly px-3.5" onMouseLeave={() => setHover(null)}>
        {rows.map((r) => {
          const t = r.soldUnits + r.canceledUnits + r.expiredUnits;
          return (
            <li
              key={r.name}
              className="grid h-6 cursor-pointer grid-cols-[minmax(96px,168px)_minmax(0,1fr)_40px] items-center gap-2.5"
              onMouseEnter={() => setHover(r)}
              onClick={() => ctx.selectItem(r.name)}
            >
              <span className="truncate text-xs text-[#e0e0e0]">{r.name}</span>
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

// ── item-ledger (XL) — the auction-house browse list, for your own trades ────

export const LEDGER_CHROME: Chrome = { toolbar: true, readout: true, footer: false };

const ROLE_LABEL: Record<Role, string> = { input: "input", output: "output", flip: "flip" };

function dateLabel(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

export function ItemLedgerBlock({ slot, ctx, stale }: BlockProps) {
  const [role, setRole] = useState<Role | "all">("all");
  const [filter, setFilter] = useState("");
  const [hover, setHover] = useState<LedgerRow | null>(null);
  const totalRevenue = useMemo(() => ctx.ledger.reduce((s, r) => s + r.revenue, 0), [ctx.ledger]);
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return ctx.ledger.filter((r) => (role === "all" || r.role === role) && (!q || r.name.toLowerCase().includes(q)));
  }, [ctx.ledger, role, filter]);
  const k80 = useMemo(() => itemsForShare(ctx.ledger, 0.8), [ctx.ledger]);

  const columns: Column<LedgerRow>[] = [
    { id: "name", header: "Item", fill: 2.4, minWidth: 200, sortValue: (r) => r.name, render: (r) => r.name },
    { id: "role", header: "Role", width: 72, sortValue: (r) => r.role, render: (r) => <span className="text-[#999]">{ROLE_LABEL[r.role]}</span> },
    { id: "sold", header: "Sold", width: 84, align: "right", sortValue: (r) => r.soldUnits, render: (r) => units(r.soldUnits) },
    { id: "revenue", header: "Revenue", width: 120, align: "right", sortValue: (r) => r.revenue, render: (r) => <Money copper={r.revenue} /> },
    { id: "share", header: "Share", width: 72, align: "right", sortValue: (r) => r.revenue, render: (r) => <span className="text-[#999]">{pct(totalRevenue ? r.revenue / totalRevenue : 0, 1)}</span> },
    { id: "bought", header: "Bought", width: 84, align: "right", sortValue: (r) => r.boughtUnits, render: (r) => (r.boughtUnits ? units(r.boughtUnits) : "—") },
    { id: "spend", header: "Spend", width: 120, align: "right", sortValue: (r) => r.spend, render: (r) => (r.spend ? <Money copper={r.spend} /> : "—") },
    {
      id: "avg",
      header: "Avg sell",
      width: 110,
      align: "right",
      sortValue: (r) => (r.soldUnits ? r.revenue / r.soldUnits : 0),
      render: (r) => (r.soldUnits ? <Money copper={Math.round(r.revenue / r.soldUnits)} /> : "—"),
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

  const fields: ReadoutField[] | null = hover
    ? [
        { label: "Item", value: hover.name },
        { label: "Avg sell", value: hover.soldUnits ? <Money copper={Math.round(hover.revenue / hover.soldUnits)} /> : "—" },
        { label: "Avg buy", value: hover.boughtUnits ? <Money copper={Math.round(hover.spend / hover.boughtUnits)} /> : "—" },
        { label: "First seen", value: dateLabel(hover.firstSeen) },
        { label: "Last seen", value: dateLabel(hover.lastSeen) },
      ]
    : null;

  return (
    <BlockShell
      slot={slot}
      title="Items"
      chrome={LEDGER_CHROME}
      stale={stale}
      status={ctx.ledger.length === 0 ? { kind: "empty", message: "No auction activity in this range." } : { kind: "ready" }}
      summary={`${units(ctx.ledger.length)} items · ${k80} carry 80% of revenue`}
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
            Filter
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="item name"
              className="h-[26px] w-44 rounded-md border border-[#333] bg-[#1a1a1a] px-2 text-xs text-[#e0e0e0] outline-none focus:border-[#666]"
            />
          </label>
          <span className="truncate text-xs text-[#999]">
            {rows.length === ctx.ledger.length ? "" : `${units(rows.length)} shown`}
          </span>
        </>
      }
      readout={{ fields, idle: "Click a row to make it the active item. Auction rows only; roles are computed over all time." }}
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
            initialSort={{ id: "revenue", dir: "desc" }}
            selectedKey={ctx.item}
            onSelect={(r) => ctx.selectItem(r.name)}
            onHover={setHover}
          />
        )}
      </div>
    </BlockShell>
  );
}

// ── concentration (S) ────────────────────────────────────────────────────────

export const CONCENTRATION_CHROME: Chrome = { toolbar: true, readout: true, footer: false };
const RANKS = 30;

export function ConcentrationBlock({ slot, ctx, stale }: BlockProps) {
  const [key, setKey] = useState<"revenue" | "spend">("revenue");
  const [hover, setHover] = useState<number | null>(null);
  const shares = useMemo(() => cumulativeShares(ctx.ledger, RANKS, key), [ctx.ledger, key]);
  const ranked = useMemo(() => [...ctx.ledger].sort((a, b) => b[key] - a[key]).slice(0, RANKS), [ctx.ledger, key]);
  const k = useMemo(() => itemsForShare(ctx.ledger, 0.8, key), [ctx.ledger, key]);
  const n = ctx.ledger.filter((r) => r[key] > 0).length;

  return (
    <BlockShell
      slot={slot}
      title={key === "revenue" ? "Revenue concentration" : "Spend concentration"}
      chrome={CONCENTRATION_CHROME}
      stale={stale}
      status={n === 0 ? { kind: "empty", message: "No auction activity in this range." } : { kind: "ready" }}
      summary={`${k} of ${units(n)} items make 80%`}
      toolbar={
        <Segmented
          label="Measure"
          value={key}
          onChange={setKey}
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "spend", label: "Spend" },
          ]}
        />
      }
      readout={{
        fields:
          hover == null
            ? null
            : [
                { label: "Rank", value: String(hover + 1) },
                { label: "Cumulative", value: pct(shares[hover]) },
                { label: "Item", value: ranked[hover]?.name ?? "—" },
              ],
        idle: `Top ${RANKS} items by ${key}, cumulative share. The line marks 80%.`,
      }}
    >
      <div className="absolute inset-0 flex flex-col px-3.5 pt-2">
        <div className="relative min-h-0 flex-1 border-b border-l border-[#444]" onMouseLeave={() => setHover(null)}>
          <div className="absolute inset-0 grid items-end gap-px" style={{ gridTemplateColumns: `repeat(${RANKS}, minmax(0, 1fr))` }}>
            {Array.from({ length: RANKS }, (_, i) => (
              <div
                key={i}
                className="h-full"
                onMouseEnter={() => setHover(i)}
                style={{ display: "flex", alignItems: "flex-end", background: hover === i ? "#2c2c2c" : undefined }}
              >
                <div className="w-full" style={{ height: `${(shares[i] ?? 0) * 100}%`, background: i < k ? "#5dcaa5" : "#3f6f60" }} />
              </div>
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

// ── house-split (S) ──────────────────────────────────────────────────────────

export const HOUSE_CHROME: Chrome = { toolbar: false, readout: true, footer: false };

export function HouseSplitBlock({ slot, stale }: BlockProps) {
  return (
    <BlockShell
      slot={slot}
      title="By auction house"
      chrome={HOUSE_CHROME}
      stale={stale}
      status={{
        kind: "unavailable",
        message:
          "This dataset has one auction house. On a Forever dataset, assign each character a faction to split revenue between the Alliance, Horde and Blackwater houses.",
      }}
    />
  );
}

// ── fees (S) ─────────────────────────────────────────────────────────────────

export const FEES_CHROME: Chrome = { toolbar: false, readout: false, footer: false };

export function FeesBlock({ slot, ctx, stale }: BlockProps) {
  const f = useMemo(
    () => feesSummary(ctx.rangeSet.income, ctx.rangeSet.expenses, ctx.ownChars),
    [ctx.rangeSet.income, ctx.rangeSet.expenses, ctx.ownChars],
  );
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
      title="Fees and upkeep"
      chrome={FEES_CHROME}
      stale={stale}
      status={hasLedger ? { kind: "ready" } : { kind: "unavailable", message: "Needs the income and expenses files from the export." }}
      summary={
        <>
          <Money copper={f.total} /> · {pct(revenue ? f.total / revenue : null, 2)} of revenue
        </>
      }
    >
      <div className="flex h-full flex-col justify-center px-3.5">
        {f.categories.slice(0, 3).map((c) => (
          line(c.type, `${units(c.entries)} entries`, c.copper)
        ))}
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
