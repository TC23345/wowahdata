"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import type { PurchaseSaleRow } from "@/lib/csv";
import { buildScatterData, type ScatterPoint } from "@/lib/charts";
import { COLORS, ensureChartsRegistered } from "./chartjsSetup";

ensureChartsRegistered();

type Props = {
  buys: PurchaseSaleRow[];
  sells: PurchaseSaleRow[];
  itemName: string;
};

export function ScatterChart({ buys, sells, itemName }: Props) {
  const data = useMemo(() => buildScatterData(buys, sells), [buys, sells]);

  if (data.dayLabels.length === 0) {
    return (
      <p className="rounded-lg border border-[#333] bg-[#252525] p-6 text-sm text-[#999]">
        No buy or sell activity for {itemName} in this range.
      </p>
    );
  }

  const chartData = {
    datasets: [
      {
        type: "bubble" as const,
        label: "Buys",
        data: data.buys.map((p) => ({ x: p.x, y: p.y, r: p.r, raw: p })),
        backgroundColor: COLORS.buyFill,
        borderColor: COLORS.buyStroke,
        borderWidth: 1,
      },
      {
        type: "bubble" as const,
        label: "Sells",
        data: data.sells.map((p) => ({ x: p.x, y: p.y, r: p.r, raw: p })),
        backgroundColor: COLORS.sellFill,
        borderColor: COLORS.sellStroke,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear" as const,
        min: -0.6,
        max: data.dayLabels.length - 0.4,
        ticks: {
          stepSize: 1,
          callback: (value: number | string) => {
            const idx = typeof value === "number" ? value : parseInt(value, 10);
            return data.dayLabels[idx] ?? "";
          },
          color: COLORS.text,
        },
        grid: { color: "#2a2a2a" },
      },
      y: {
        title: { display: true, text: "Gold per unit", color: COLORS.text },
        ticks: { color: COLORS.text },
        grid: { color: "#2a2a2a" },
      },
    },
    plugins: {
      legend: { labels: { color: "#e0e0e0" } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"bubble">) => {
            const raw = ctx.raw as { raw?: ScatterPoint } | null;
            const p = raw?.raw;
            if (!p) return "";
            return [
              `${p.side === "buy" ? "Buy" : "Sell"} · ${p.dayLabel}`,
              `${p.qty} units @ ${p.pricePerUnitGold.toFixed(2)}g`,
              `total ${p.totalGold.toFixed(2)}g`,
            ];
          },
        },
      },
    },
  };

  return (
    <div className="rounded-lg border border-[#333] bg-[#252525] p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-[#e0e0e0]">
          Buys vs Sells over time
        </h3>
        <p className="text-xs text-[#666]">
          {data.buys.length} buys · {data.sells.length} sells
        </p>
      </header>
      <div className="h-[420px]">
        <Chart type="bubble" data={chartData} options={options} />
      </div>
    </div>
  );
}
