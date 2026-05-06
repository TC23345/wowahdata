"use client";

import type { ItemStats } from "@/lib/transform";

function fmtGold(g: number, signed = false): string {
  const sign = signed && g > 0 ? "+" : "";
  if (Math.abs(g) >= 10_000) return `${sign}${(g / 1000).toFixed(1)}kg`;
  if (Math.abs(g) >= 100) return `${sign}${g.toFixed(0)}g`;
  return `${sign}${g.toFixed(2)}g`;
}

export function StatCards({ stats }: { stats: ItemStats }) {
  const pnlPositive = stats.netPnlGold >= 0;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Card
        label="Net P&L"
        value={fmtGold(stats.netPnlGold, true)}
        sub="revenue − cost"
        valueClass={
          pnlPositive ? "text-[#5dcaa5]" : "text-[#e24b4a]"
        }
        emphasize
      />
      <Card
        label="Sold"
        value={stats.soldUnits.toLocaleString()}
        sub={
          stats.soldUnits > 0
            ? `${fmtGold(stats.soldRevenueGold)} · ${stats.avgReceivedGold.toFixed(2)}g/u`
            : "—"
        }
      />
      <Card
        label="Bought"
        value={stats.boughtUnits.toLocaleString()}
        sub={stats.boughtUnits > 0 ? fmtGold(stats.boughtCostGold) : "—"}
      />
      <Card
        label="Expired"
        value={stats.expiredUnits.toLocaleString()}
        sub={stats.expiredUnits > 0 ? "didn't clear" : "—"}
      />
      <Card
        label="Canceled"
        value={stats.canceledUnits.toLocaleString()}
        sub={stats.canceledUnits > 0 ? "you pulled" : "—"}
      />
      <Card
        label="DE source"
        value={stats.impliedDeSourcedUnits.toLocaleString()}
        sub="sold + expired − bought"
        title="Implied units sourced from disenchanting (or otherwise off-AH): sold + expired minus bought, clamped at 0. Useful for estimating how much of your throughput came from greens you DE'd vs items you flipped."
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  valueClass,
  title,
  emphasize,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  title?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      title={title}
      className={`rounded-md border p-3 transition-colors ${
        emphasize
          ? "border-[#3a4d44] bg-[#1f2a26]"
          : "border-[#333] bg-[#252525]"
      } ${title ? "cursor-help" : ""}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#666]">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          valueClass ?? "text-[#e0e0e0]"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-[#666]">{sub}</p>}
    </div>
  );
}
