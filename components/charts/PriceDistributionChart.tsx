"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { PurchaseSaleRow } from "@/lib/csv";
import { buildPriceHistogram, summarizeHistogram } from "@/lib/charts";
import { fmtGold } from "@/lib/format";
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

export function PriceDistributionChart({ buys, sells, itemName }: Props) {
  const theme = useTheme();
  const bins = useMemo(() => buildPriceHistogram(buys, sells), [buys, sells]);
  const summary = useMemo(() => summarizeHistogram(bins), [bins]);

  if (bins.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">
        No price data for {itemName} in this range.
      </p>
    );
  }

  applyChartDefaults();
  const c = getChartColors();

  const labels = bins.map((b) => b.bucketStart.toFixed(2));
  const chartData = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Buys (units)",
        data: bins.map((b) => b.buyUnits),
        backgroundColor: c.buyFill,
        borderColor: c.buyStroke,
        borderWidth: 1,
      },
      {
        type: "bar" as const,
        label: "Sells (units)",
        data: bins.map((b) => b.sellUnits),
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
        title: { display: true, text: "Gold per unit (0.25g buckets)", color: c.text },
        ticks: { color: c.text, autoSkip: true, maxTicksLimit: 16 },
        grid: { color: c.grid },
      },
      y: {
        title: { display: true, text: "Total units", color: c.text },
        beginAtZero: true,
        ticks: { color: c.text },
        grid: { color: c.grid },
      },
    },
    plugins: {
      legend: { labels: { color: c.text } },
    },
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <header className="mb-2">
        <h3 className="text-sm font-medium text-text-primary">Price distribution</h3>
        <p className="text-xs text-text-muted">
          Spread between buy floor and sell ceiling for {itemName}
        </p>
      </header>
      <SummaryStrip summary={summary} />
      <div className="h-[clamp(320px,45vh,560px)]">
        <Chart key={theme} type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}

function SummaryStrip({
  summary,
}: {
  summary: ReturnType<typeof summarizeHistogram>;
}) {
  const { medianBuyGold, medianSellGold, spreadGold } = summary;
  const spreadPositive = spreadGold !== null && spreadGold > 0;
  return (
    <div
      className="mb-3 grid grid-cols-3 gap-2"
      title="Bucket-aligned weighted medians (0.25g resolution). Spread = median sell − median buy."
    >
      <SummaryCell label="Median buy" value={fmtOrDash(medianBuyGold)} />
      <SummaryCell label="Median sell" value={fmtOrDash(medianSellGold)} />
      <SummaryCell
        label="Spread"
        value={spreadGold === null ? "—" : fmtGold(spreadGold, true)}
        valueClass={
          spreadGold === null
            ? undefined
            : spreadPositive
              ? "text-profit"
              : "text-loss"
        }
      />
    </div>
  );
}

function fmtOrDash(g: number | null): string {
  return g === null ? "—" : fmtGold(g);
}

function SummaryCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          valueClass ?? "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
