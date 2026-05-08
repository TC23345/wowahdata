"use client";

import {
  Chart,
  BarController,
  BarElement,
  BubbleController,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

let registered = false;

export function ensureChartsRegistered(): void {
  if (registered) return;
  Chart.register(
    BarController,
    BarElement,
    BubbleController,
    CategoryScale,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
  );
  Chart.defaults.font.family =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  registered = true;
  applyChartDefaults();
}

// Fallback values used during SSR / before the document has resolved CSS vars.
const FALLBACKS: Record<string, string> = {
  buy: "rgb(29, 158, 117)",
  sell: "rgb(83, 74, 183)",
  profit: "#5dcaa5",
  loss: "#e24b4a",
  surface: "#252525",
  border: "#333",
  textSecondary: "#999",
  grid: "#2a2a2a",
  stack1: "#7e5a99",
  stack2: "#c0584c",
  stack3: "#5a5a5a",
};

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v.length > 0 ? v : fallback;
}

// Pull a numeric alpha onto an `rgb(r,g,b)` string, returning `rgba(r,g,b,a)`.
// If the input isn't an rgb()/rgba() string we just return it untouched —
// callers should pick CSS-var defaults that resolve to rgb() for fills/strokes.
function withAlpha(rgb: string, alpha: number): string {
  const m = rgb.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return rgb;
  const parts = m[1].split(",").map((p) => p.trim());
  const [r, g, b] = parts;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type ChartColors = {
  buy: string;
  sell: string;
  buyFill: string;
  buyStroke: string;
  sellFill: string;
  sellStroke: string;
  profit: string;
  loss: string;
  surface: string;
  border: string;
  text: string;
  grid: string;
  stack1: string;
  stack2: string;
  stack3: string;
};

export function getChartColors(): ChartColors {
  const buy = readVar("--buy", FALLBACKS.buy);
  const sell = readVar("--sell", FALLBACKS.sell);
  const profit = readVar("--profit", FALLBACKS.profit);
  const loss = readVar("--loss", FALLBACKS.loss);
  const surface = readVar("--surface", FALLBACKS.surface);
  const border = readVar("--border", FALLBACKS.border);
  const text = readVar("--text-secondary", FALLBACKS.textSecondary);
  const grid = readVar("--chart-grid", FALLBACKS.grid);
  const stack1 = readVar("--chart-stack-1", FALLBACKS.stack1);
  const stack2 = readVar("--chart-stack-2", FALLBACKS.stack2);
  const stack3 = readVar("--chart-stack-3", FALLBACKS.stack3);

  return {
    buy,
    sell,
    buyFill: withAlpha(buy, 0.4),
    buyStroke: withAlpha(buy, 0.85),
    sellFill: withAlpha(sell, 0.35),
    sellStroke: withAlpha(sell, 0.8),
    profit,
    loss,
    surface,
    border,
    text,
    grid,
    stack1,
    stack2,
    stack3,
  };
}

export function applyChartDefaults(): void {
  const c = getChartColors();
  Chart.defaults.color = c.text;
  Chart.defaults.borderColor = c.border;
}

// Backward-compat: a number of components import `COLORS`. Wire it up as a
// proxy that reads fresh values on every property access, so existing
// `COLORS.profit` references stay correct after a theme swap.
export const COLORS: ChartColors = new Proxy({} as ChartColors, {
  get(_t, prop: string): string {
    const c = getChartColors();
    return c[prop as keyof ChartColors];
  },
});
