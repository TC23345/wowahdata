"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { LoadedData } from "@/lib/csv";
import { aggregateCashFlow, type CashFlowWeek } from "@/lib/cashflow";
import {
  applyChartDefaults,
  ensureChartsRegistered,
  getChartColors,
} from "@/components/charts/chartjsSetup";
import { Card } from "@/components/ui/Card";
import { fmtGold } from "@/lib/format";
import { useTheme } from "@/lib/useTheme";

ensureChartsRegistered();

type Props = {
  income: LoadedData["income"];
  expenses: LoadedData["expenses"];
};

export function CashFlowPanel({ income, expenses }: Props) {
  const theme = useTheme();
  const weeks = useMemo(() => aggregateCashFlow(income, expenses), [income, expenses]);

  if (weeks.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">
        No income or expense rows in this dataset.
      </p>
    );
  }

  applyChartDefaults();
  const c = getChartColors();

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
        backgroundColor: c.stack1,
        stack: "flow",
      },
      {
        type: "bar" as const,
        label: "Repairs",
        data: weeks.map((w) => -w.repairGold),
        backgroundColor: c.stack2,
        stack: "flow",
      },
      {
        type: "bar" as const,
        label: "Out (transfers/other)",
        data: weeks.map((w) => -(w.expenseTransfersGold + w.otherExpenseGold)),
        backgroundColor: c.stack3,
        stack: "flow",
      },
      {
        type: "bar" as const,
        label: "In (transfers/other)",
        data: weeks.map((w) => w.incomeTransfersGold + w.otherIncomeGold),
        backgroundColor: c.profit,
        stack: "flow",
      },
      {
        type: "line" as const,
        label: "Net",
        data: weeks.map((w) => w.netGold),
        borderColor: c.text,
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
      x: { stacked: true, ticks: { color: c.text }, grid: { color: c.grid } },
      y: {
        stacked: true,
        title: { display: true, text: "Gold (out negative)", color: c.text },
        ticks: { color: c.text },
        grid: { color: c.grid },
      },
    },
    plugins: { legend: { labels: { color: c.text } } },
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
      <div className="rounded-lg border border-border bg-surface p-4">
        <header className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            Cash flow by week
          </h3>
          <p className="text-xs text-text-muted">
            {weeks.length} week{weeks.length === 1 ? "" : "s"}
          </p>
        </header>
        <div className="h-[clamp(340px,48vh,600px)]">
          <Chart key={theme} type="bar" data={chartData} options={options} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <Card label="Postage" value={fmtGold(totals.postageGold)} sub="total" size="sm" />
        <Card label="Repairs" value={fmtGold(totals.repairGold)} sub="total" size="sm" />
        <Card label="Transfers out" value={fmtGold(totals.expenseTransfersGold)} size="sm" />
        <Card label="Transfers in" value={fmtGold(totals.incomeTransfersGold)} size="sm" />
        <Card
          label="Net"
          value={fmtGold(totals.netGold)}
          valueClass={totals.netGold >= 0 ? "text-profit" : "text-loss"}
          size="sm"
        />
      </div>
    </div>
  );
}
