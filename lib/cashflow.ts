import { type CashFlowRow, copperToGold } from "./csv";
import { weekStartTuesday } from "./weeks";

export type CashFlowWeek = {
  weekStartIso: string;
  weekStart: Date;
  postageGold: number;
  repairGold: number;
  expenseTransfersGold: number;
  incomeTransfersGold: number;
  otherExpenseGold: number;
  otherIncomeGold: number;
  totalExpensesGold: number;
  totalIncomeGold: number;
  netGold: number;
};

function isoWeekKey(d: Date): string {
  const ws = weekStartTuesday(d);
  return ws.toISOString().slice(0, 10);
}

export function aggregateCashFlow(
  income: CashFlowRow[],
  expenses: CashFlowRow[],
): CashFlowWeek[] {
  const weeks = new Map<string, CashFlowWeek>();
  const ensure = (t: number): CashFlowWeek => {
    const d = new Date(t * 1000);
    const key = isoWeekKey(d);
    let w = weeks.get(key);
    if (!w) {
      w = {
        weekStartIso: key,
        weekStart: weekStartTuesday(d),
        postageGold: 0,
        repairGold: 0,
        expenseTransfersGold: 0,
        incomeTransfersGold: 0,
        otherExpenseGold: 0,
        otherIncomeGold: 0,
        totalExpensesGold: 0,
        totalIncomeGold: 0,
        netGold: 0,
      };
      weeks.set(key, w);
    }
    return w;
  };

  for (const r of expenses) {
    const w = ensure(r.time);
    const g = copperToGold(r.amount);
    if (r.type === "Postage") w.postageGold += g;
    else if (r.type === "Repair Bill") w.repairGold += g;
    else if (r.type === "Money Transfer") w.expenseTransfersGold += g;
    else w.otherExpenseGold += g;
    w.totalExpensesGold += g;
  }
  for (const r of income) {
    const w = ensure(r.time);
    const g = copperToGold(r.amount);
    if (r.type === "Money Transfer") w.incomeTransfersGold += g;
    else w.otherIncomeGold += g;
    w.totalIncomeGold += g;
  }

  const sorted = [...weeks.values()].sort((a, b) =>
    a.weekStartIso.localeCompare(b.weekStartIso),
  );
  for (const w of sorted) {
    w.netGold = w.totalIncomeGold - w.totalExpensesGold;
  }
  return sorted;
}
