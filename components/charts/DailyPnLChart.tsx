"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { ExpiredCanceledRow, PurchaseSaleRow } from "@/lib/csv";
import { buildDailyPnL } from "@/lib/charts";
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
  expired: ExpiredCanceledRow[];
  canceled: ExpiredCanceledRow[];
  itemName: string;
};

export function DailyPnLChart({ buys, sells, expired, canceled, itemName }: Props) {
  const theme = useTheme();
  const series = useMemo(
    () => buildDailyPnL(buys, sells, expired, canceled),
    [buys, sells, expired, canceled],
  );

  if (series.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">
        No P&L activity for {itemName} in this range.
      </p>
    );
  }

  applyChartDefaults();
  const c = getChartColors();

  const labels = series.map((d) => d.dayLabel);
  const barColors = series.map((d) => (d.netGold >= 0 ? c.profit : c.loss));

  const chartData = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Daily net (gold)",
        data: series.map((d) => d.netGold),
        backgroundColor: barColors,
        borderColor: barColors,
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "Cumulative",
        data: series.map((d) => d.cumulativeNetGold),
        borderColor: c.text,
        backgroundColor: "rgba(224, 224, 224, 0.08)",
        tension: 0.2,
        pointRadius: 0,
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: c.text }, grid: { color: c.grid } },
      y: {
        title: { display: true, text: "Daily net (gold)", color: c.text },
        ticks: { color: c.text },
        grid: { color: c.grid },
      },
      y1: {
        position: "right" as const,
        title: { display: true, text: "Cumulative (gold)", color: c.text },
        ticks: { color: c.text },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      legend: { labels: { color: c.text } },
      tooltip: {
        callbacks: {
          afterBody: (items: { dataIndex: number }[]) => {
            const i = items[0]?.dataIndex;
            if (i == null) return [];
            const d = series[i];
            return [
              `bought ${d.boughtUnits} (${d.boughtCostGold.toFixed(0)}g)`,
              `sold ${d.soldUnits} (${d.soldRevenueGold.toFixed(0)}g)`,
              `expired ${d.expiredUnits} · canceled ${d.canceledUnits}`,
            ];
          },
        },
      },
    },
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-text-primary">Daily P&amp;L</h3>
        <p className="text-xs text-text-muted">
          {series.length} day{series.length === 1 ? "" : "s"} of activity
        </p>
      </header>
      <div className="h-[clamp(360px,50vh,640px)]">
        <Chart key={theme} type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}
