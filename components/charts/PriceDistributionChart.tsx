"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { PurchaseSaleRow } from "@/lib/csv";
import { buildPriceHistogram } from "@/lib/charts";
import { COLORS, ensureChartsRegistered } from "./chartjsSetup";

ensureChartsRegistered();

type Props = {
  buys: PurchaseSaleRow[];
  sells: PurchaseSaleRow[];
  itemName: string;
};

export function PriceDistributionChart({ buys, sells, itemName }: Props) {
  const bins = useMemo(() => buildPriceHistogram(buys, sells), [buys, sells]);

  if (bins.length === 0) {
    return (
      <p className="rounded-lg border border-[#333] bg-[#252525] p-6 text-sm text-[#999]">
        No price data for {itemName} in this range.
      </p>
    );
  }

  const labels = bins.map((b) => b.bucketStart.toFixed(2));
  const chartData = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Buys (units)",
        data: bins.map((b) => b.buyUnits),
        backgroundColor: COLORS.buyFill,
        borderColor: COLORS.buyStroke,
        borderWidth: 1,
      },
      {
        type: "bar" as const,
        label: "Sells (units)",
        data: bins.map((b) => b.sellUnits),
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
        title: { display: true, text: "Gold per unit (0.25g buckets)", color: COLORS.text },
        ticks: { color: COLORS.text, autoSkip: true, maxTicksLimit: 16 },
        grid: { color: "#2a2a2a" },
      },
      y: {
        title: { display: true, text: "Total units", color: COLORS.text },
        beginAtZero: true,
        ticks: { color: COLORS.text },
        grid: { color: "#2a2a2a" },
      },
    },
    plugins: {
      legend: { labels: { color: "#e0e0e0" } },
    },
  };

  return (
    <div className="rounded-lg border border-[#333] bg-[#252525] p-4">
      <header className="mb-2">
        <h3 className="text-sm font-medium text-[#e0e0e0]">Price distribution</h3>
        <p className="text-xs text-[#666]">
          Spread between buy floor and sell ceiling for {itemName}
        </p>
      </header>
      <div className="h-[clamp(320px,45vh,560px)]">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}
