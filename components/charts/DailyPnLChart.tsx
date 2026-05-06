"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { ExpiredCanceledRow, PurchaseSaleRow } from "@/lib/csv";
import { buildDailyPnL } from "@/lib/charts";
import { COLORS, ensureChartsRegistered } from "./chartjsSetup";

ensureChartsRegistered();

type Props = {
  buys: PurchaseSaleRow[];
  sells: PurchaseSaleRow[];
  expired: ExpiredCanceledRow[];
  canceled: ExpiredCanceledRow[];
  itemName: string;
};

export function DailyPnLChart({ buys, sells, expired, canceled, itemName }: Props) {
  const series = useMemo(
    () => buildDailyPnL(buys, sells, expired, canceled),
    [buys, sells, expired, canceled],
  );

  if (series.length === 0) {
    return (
      <p className="rounded-lg border border-[#333] bg-[#252525] p-6 text-sm text-[#999]">
        No P&L activity for {itemName} in this range.
      </p>
    );
  }

  const labels = series.map((d) => d.dayLabel);
  const barColors = series.map((d) =>
    d.netGold >= 0 ? COLORS.profit : COLORS.loss,
  );

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
        borderColor: "#e0e0e0",
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
      x: { ticks: { color: COLORS.text }, grid: { color: "#2a2a2a" } },
      y: {
        title: { display: true, text: "Daily net (gold)", color: COLORS.text },
        ticks: { color: COLORS.text },
        grid: { color: "#2a2a2a" },
      },
      y1: {
        position: "right" as const,
        title: { display: true, text: "Cumulative (gold)", color: COLORS.text },
        ticks: { color: COLORS.text },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      legend: { labels: { color: "#e0e0e0" } },
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
    <div className="rounded-lg border border-[#333] bg-[#252525] p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-[#e0e0e0]">Daily P&amp;L</h3>
        <p className="text-xs text-[#666]">
          {series.length} day{series.length === 1 ? "" : "s"} of activity
        </p>
      </header>
      <div className="h-[360px]">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}
