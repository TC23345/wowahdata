"use client";

import type { ReactNode } from "react";
import { Money } from "@/components/ah/Money";
import { binToHeatmap } from "@/lib/heatmap";
import { feesSummary, isAuction, itemsForShare, listingSuccess, peakHours, sumCopper, sumUnits } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import type { KpiId } from "@/lib/pages";
import type { BlockCtx } from "./context";
import { pad2, pct, tzLabel, units } from "./types";

export type KpiValue = { label: string; value: ReactNode; sub: string };

/** Each KPI card's content. Six per scope, always in the same slots. */
export function kpiValue(id: KpiId, ctx: BlockCtx): KpiValue {
  const item = ctx.itemSet;
  const sold = item.sales.filter(isAuction);
  const bought = item.purchases.filter(isAuction);
  const su = sumUnits(sold);
  const bu = sumUnits(bought);
  const sg = sumCopper(sold);
  const bg = sumCopper(bought);
  const scope = ctx.scope === "item" ? null : ctx.scopeLedger;

  switch (id) {
    case "kpi-revenue": {
      if (scope) {
        const rev = scope.reduce((s, r) => s + r.revenue, 0);
        return { label: "Revenue", value: <Money copper={rev} />, sub: `${units(scope.filter((r) => r.soldUnits).length)} items sold` };
      }
      return {
        label: "Revenue",
        value: su ? <Money copper={sg} /> : "—",
        sub: su ? `${units(su)} units · ${formatMoney(Math.round(sg / su))} avg` : "no auction sales in range",
      };
    }
    case "kpi-spend": {
      if (scope) {
        const sp = scope.reduce((s, r) => s + r.spend, 0);
        return { label: "Spend", value: <Money copper={sp} />, sub: `${units(scope.filter((r) => r.boughtUnits).length)} items bought` };
      }
      return {
        label: "Spend",
        value: bu ? <Money copper={bg} /> : "—",
        sub: bu ? `${units(bu)} units · ${formatMoney(Math.round(bg / bu))} avg` : "not bought on the AH",
      };
    }
    case "kpi-flip-margin": {
      if (!bu || !su) return { label: "Flip margin", value: "—", sub: bu ? "nothing sold in range" : "not bought on the AH — see Pipeline" };
      const matched = Math.min(bu, su);
      const margin = Math.round(matched * (sg / su - bg / bu));
      return { label: "Flip margin", value: <Money copper={margin} sign="always" tone="pnl" />, sub: `${units(matched)} matched units` };
    }
    case "kpi-off-ah-supply": {
      const off = Math.max(0, su - bu);
      return { label: "Off-AH supply", value: units(off), sub: su ? `${pct(off / su)} of units sold` : "no auction sales in range" };
    }
    case "kpi-listing-success": {
      const rows = scope ?? null;
      const s = rows ? rows.reduce((a, r) => a + r.soldUnits, 0) : su;
      const e = rows ? rows.reduce((a, r) => a + r.expiredUnits, 0) : sumUnits(item.expired);
      const c = rows ? rows.reduce((a, r) => a + r.canceledUnits, 0) : sumUnits(item.canceled);
      return { label: "Listing success", value: pct(listingSuccess(s, e, c)), sub: "sold ÷ sold + expired + canceled" };
    }
    case "kpi-peak-hours": {
      if (!su) return { label: "Peak 8 hours", value: "—", sub: "no auction sales in range" };
      const units168 = binToHeatmap(sold, "units", ctx.tz).cells.flat().map((c) => c.units);
      const peak = peakHours(units168, 8);
      return { label: "Peak 8 hours", value: pct(peak.share), sub: `${pad2(peak.start)}:00–${pad2((peak.start + 8) % 24)}:00 ${tzLabel(ctx.tz)}` };
    }
    case "kpi-pipeline-sold":
      return { label: "Sold", value: <Money copper={ctx.pipeline.revenue} />, sub: `${units(ctx.pipeline.soldUnits)} units, all members` };
    case "kpi-pipeline-bought":
      return { label: "Bought", value: <Money copper={ctx.pipeline.spend} />, sub: "inputs and outputs bought" };
    case "kpi-pipeline-margin":
      return { label: "Pipeline margin", value: <Money copper={ctx.pipeline.margin} />, sub: "stock on hand not counted" };
    case "kpi-pipeline-margin-pct":
      return {
        label: "Margin of spend",
        value: ctx.pipeline.spend ? pct(ctx.pipeline.margin / ctx.pipeline.spend, 1) : "—",
        sub: "sold − bought ÷ bought",
      };
    case "kpi-top-output": {
      const top = ctx.pipeline.outputs[0];
      return {
        label: "Top output",
        value: top && ctx.pipeline.revenue ? pct(top.copper / ctx.pipeline.revenue) : "—",
        sub: top ? top.name : "no outputs in range",
      };
    }
    case "kpi-net-flow": {
      const rev = ctx.ledger.reduce((s, r) => s + r.revenue, 0);
      const sp = ctx.ledger.reduce((s, r) => s + r.spend, 0);
      return { label: "Net gold flow", value: <Money copper={rev - sp} />, sub: "not profit: stock is unseen" };
    }
    case "kpi-concentration": {
      const n = ctx.ledger.filter((r) => r.revenue > 0).length;
      return { label: "80% of revenue from", value: `${itemsForShare(ctx.ledger, 0.8)} items`, sub: `of ${units(n)} sold` };
    }
    case "kpi-fees": {
      if (ctx.data.income.length + ctx.data.expenses.length === 0) return { label: "Fees and upkeep", value: "—", sub: "needs income and expenses files" };
      const f = feesSummary(ctx.rangeSet.income, ctx.rangeSet.expenses, ctx.ownChars);
      const rev = ctx.ledger.reduce((s, r) => s + r.revenue, 0);
      return { label: "Fees and upkeep", value: <Money copper={f.total} />, sub: `${pct(rev ? f.total / rev : null, 2)} of revenue` };
    }
  }
}

export const KPI_LABELS: Record<KpiId, string> = {
  "kpi-revenue": "Revenue",
  "kpi-spend": "Spend",
  "kpi-flip-margin": "Flip margin",
  "kpi-off-ah-supply": "Off-AH supply",
  "kpi-listing-success": "Listing success",
  "kpi-peak-hours": "Peak 8 hours",
  "kpi-pipeline-sold": "Sold",
  "kpi-pipeline-bought": "Bought",
  "kpi-pipeline-margin": "Pipeline margin",
  "kpi-pipeline-margin-pct": "Margin of spend",
  "kpi-top-output": "Top output",
  "kpi-net-flow": "Net gold flow",
  "kpi-concentration": "80% of revenue from",
  "kpi-fees": "Fees and upkeep",
};
