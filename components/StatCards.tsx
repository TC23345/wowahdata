"use client";

import type { ItemStats } from "@/lib/transform";
import { Card } from "@/components/ui/Card";
import { fmtGold, fmtGoldFull } from "@/lib/format";

export function StatCards({ stats }: { stats: ItemStats }) {
  const pnlPositive = stats.netPnlGold >= 0;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Card
        label="Net P&L"
        value={fmtGoldFull(stats.netPnlGold, true)}
        sub="revenue − cost"
        valueClass={
          pnlPositive ? "text-profit" : "text-loss"
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
