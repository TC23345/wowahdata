"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import type { PurchaseSaleRow } from "@/lib/csv";
import { buildScatterData, type ScatterPoint } from "@/lib/charts";
import {
  applyChartDefaults,
  ensureChartsRegistered,
  getChartColors,
} from "./chartjsSetup";
import { useTheme } from "@/lib/useTheme";

ensureChartsRegistered();

type Props = {
  buys: PurchaseSaleRow[];
  sells: PurchaseSaleRow[];
  itemName: string;
};

export function ScatterChart({ buys, sells, itemName }: Props) {
  const theme = useTheme();
  const data = useMemo(() => buildScatterData(buys, sells), [buys, sells]);

  if (data.dayLabels.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">
        No buy or sell activity for {itemName} in this range.
      </p>
    );
  }

  // Refresh defaults + read fresh CSS-var-backed colors on every render so a
  // theme swap repaints immediately.
  applyChartDefaults();
  const c = getChartColors();

  const chartData = {
    datasets: [
      {
        type: "bubble" as const,
        label: "Buys",
        data: data.buys.map((p) => ({ x: p.x, y: p.y, r: p.r, raw: p })),
        backgroundColor: c.buyFill,
        borderColor: c.buyStroke,
        borderWidth: 1,
      },
      {
        type: "bubble" as const,
        label: "Sells",
        data: data.sells.map((p) => ({ x: p.x, y: p.y, r: p.r, raw: p })),
        backgroundColor: c.sellFill,
        borderColor: c.sellStroke,
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
          color: c.text,
        },
        grid: { color: c.grid },
      },
      y: {
        title: { display: true, text: "Gold per unit", color: c.text },
        ticks: { color: c.text },
        grid: { color: c.grid },
      },
    },
    plugins: {
      legend: { labels: { color: c.text } },
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Buys vs Sells over time
        </h3>
        <p className="text-xs text-text-muted">
          {data.buys.length} buys · {data.sells.length} sells
        </p>
      </header>
      <div className="h-[clamp(420px,55vh,720px)]">
        <Chart key={theme} type="bubble" data={chartData} options={options} />
      </div>
    </div>
  );
}
