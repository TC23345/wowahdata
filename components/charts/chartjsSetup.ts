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
  Chart.defaults.font.family =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  registered = true;
}

export const COLORS = {
  buyFill: "rgba(29, 158, 117, 0.4)",
  buyStroke: "rgba(29, 158, 117, 0.85)",
  sellFill: "rgba(83, 74, 183, 0.35)",
  sellStroke: "rgba(83, 74, 183, 0.8)",
  profit: "#5dcaa5",
  loss: "#e24b4a",
  surface: "#252525",
  border: "#333",
  text: "#999",
} as const;
