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
      <Card label="Bought" value={stats.boughtUnits.toLocaleString()} sub={fmtGold(stats.boughtCostGold)} />
      <Card
        label="Sold"
        value={stats.soldUnits.toLocaleString()}
        sub={
          stats.soldUnits > 0
            ? `${fmtGold(stats.soldRevenueGold)} · ${stats.avgReceivedGold.toFixed(2)}g/u`
            : "—"
        }
      />
      <Card label="Expired" value={stats.expiredUnits.toLocaleString()} />
      <Card label="Canceled" value={stats.canceledUnits.toLocaleString()} />
      <Card label="Implied DE" value={stats.impliedDeSourcedUnits.toLocaleString()} sub="sold + expired - bought" />
      <Card
        label="Net P&L"
        value={fmtGold(stats.netPnlGold, true)}
        valueClass={pnlPositive ? "text-[#5dcaa5]" : "text-[#e24b4a]"}
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border border-[#333] bg-[#252525] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#666]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass ?? "text-[#e0e0e0]"}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#666]">{sub}</p>}
    </div>
  );
}
