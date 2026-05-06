"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { LoadedData } from "@/lib/csv";
import { aggregateCashFlow, type CashFlowWeek } from "@/lib/cashflow";
import { COLORS, ensureChartsRegistered } from "@/components/charts/chartjsSetup";

ensureChartsRegistered();

type Props = {
  income: LoadedData["income"];
  expenses: LoadedData["expenses"];
};

function fmt(g: number): string {
  if (Math.abs(g) >= 10_000) return `${(g / 1000).toFixed(1)}kg`;
  if (Math.abs(g) >= 100) return `${g.toFixed(0)}g`;
  return `${g.toFixed(2)}g`;
}

export function CashFlowPanel({ income, expenses }: Props) {
  const weeks = useMemo(() => aggregateCashFlow(income, expenses), [income, expenses]);

  if (weeks.length === 0) {
    return (
      <p className="rounded-lg border border-[#333] bg-[#252525] p-6 text-sm text-[#999]">
        No income or expense rows in this dataset.
      </p>
    );
  }

  const labels = weeks.map((w) =>
    `${w.weekStart.getMonth() + 1}/${w.weekStart.getDate()}`,
  );

  const chartData = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Postage",
        data: weeks.map((w) => -w.postageGold),
        backgroundColor: "#7e5a99",
        stack: "flow",
      },
      {
        type: "bar" as const,
        label: "Repairs",
        data: weeks.map((w) => -w.repairGold),
        backgroundColor: "#c0584c",
        stack: "flow",
      },
      {
        type: "bar" as const,
        label: "Out (transfers/other)",
        data: weeks.map((w) => -(w.expenseTransfersGold + w.otherExpenseGold)),
        backgroundColor: "#5a5a5a",
        stack: "flow",
      },
      {
        type: "bar" as const,
        label: "In (transfers/other)",
        data: weeks.map((w) => w.incomeTransfersGold + w.otherIncomeGold),
        backgroundColor: COLORS.profit,
        stack: "flow",
      },
      {
        type: "line" as const,
        label: "Net",
        data: weeks.map((w) => w.netGold),
        borderColor: "#e0e0e0",
        backgroundColor: "rgba(224, 224, 224, 0.1)",
        tension: 0.2,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true, ticks: { color: COLORS.text }, grid: { color: "#2a2a2a" } },
      y: {
        stacked: true,
        title: { display: true, text: "Gold (out negative)", color: COLORS.text },
        ticks: { color: COLORS.text },
        grid: { color: "#2a2a2a" },
      },
    },
    plugins: { legend: { labels: { color: "#e0e0e0" } } },
  };

  const totals = weeks.reduce<CashFlowWeek>(
    (acc, w) => ({
      ...acc,
      postageGold: acc.postageGold + w.postageGold,
      repairGold: acc.repairGold + w.repairGold,
      expenseTransfersGold: acc.expenseTransfersGold + w.expenseTransfersGold,
      incomeTransfersGold: acc.incomeTransfersGold + w.incomeTransfersGold,
      otherExpenseGold: acc.otherExpenseGold + w.otherExpenseGold,
      otherIncomeGold: acc.otherIncomeGold + w.otherIncomeGold,
      totalExpensesGold: acc.totalExpensesGold + w.totalExpensesGold,
      totalIncomeGold: acc.totalIncomeGold + w.totalIncomeGold,
      netGold: acc.netGold + w.netGold,
    }),
    {
      weekStartIso: "",
      weekStart: new Date(0),
      postageGold: 0,
      repairGold: 0,
      expenseTransfersGold: 0,
      incomeTransfersGold: 0,
      otherExpenseGold: 0,
      otherIncomeGold: 0,
      totalExpensesGold: 0,
      totalIncomeGold: 0,
      netGold: 0,
    },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[#333] bg-[#252525] p-4">
        <header className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-[#e0e0e0]">
            Cash flow by week
          </h3>
          <p className="text-xs text-[#666]">
            {weeks.length} week{weeks.length === 1 ? "" : "s"}
          </p>
        </header>
        <div className="h-[340px]">
          <Chart type="bar" data={chartData} options={options} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <Tile label="Postage" value={fmt(totals.postageGold)} hint="total" />
        <Tile label="Repairs" value={fmt(totals.repairGold)} hint="total" />
        <Tile label="Transfers out" value={fmt(totals.expenseTransfersGold)} />
        <Tile label="Transfers in" value={fmt(totals.incomeTransfersGold)} />
        <Tile
          label="Net"
          value={fmt(totals.netGold)}
          valueClass={totals.netGold >= 0 ? "text-[#5dcaa5]" : "text-[#e24b4a]"}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border border-[#333] bg-[#252525] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#666]">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${valueClass ?? "text-[#e0e0e0]"}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-[#666]">{hint}</p>}
    </div>
  );
}
