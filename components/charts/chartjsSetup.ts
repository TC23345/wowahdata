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
  Chart.defaults.color = "#999";
  Chart.defaults.borderColor = "#333";
  // Layout laws: a data swap must not animate (it reads as movement), and the
  // legend lives in the block footer, never inside the plot.
  Chart.defaults.animation = false;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.font.family =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  registered = true;
}

export const COLORS = {
  buyFill: "rgba(29, 158, 117, 0.4)",
  buyStroke: "rgba(29, 158, 117, 0.85)",
  sellFill: "rgba(83, 74, 183, 0.35)",
  sellStroke: "rgba(83, 74, 183, 0.8)",
  buyMark: "rgb(29, 158, 117)",
  buyMarkFill: "rgba(29, 158, 117, 0.55)",
  sellMark: "#a9a2f2",
  profit: "#5dcaa5",
  loss: "#e24b4a",
  surface: "#252525",
  border: "#333",
  text: "#999",
} as const;
