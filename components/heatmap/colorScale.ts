// Theme-aware heatmap ramp. Stops are read from the active theme's CSS custom
// properties (`--heatmap-0` through `--heatmap-10`) at call time, so a theme
// swap repaints the heatmap without any addt'l plumbing.
//
// Each cellColor() call resolves the ramp once. Callers that paint many cells
// (e.g. SaleHeatmap) should use the same colorScale instance per render via
// `getHeatmapStops()` if perf becomes a concern; in practice 7×24 = 168 cells
// is fine.

const STOP_COUNT = 11;

// Reasonable viridis-ish fallback for SSR / before CSS vars resolve.
const FALLBACK_STOPS: string[] = [
  "rgb(68, 1, 84)",
  "rgb(72, 35, 116)",
  "rgb(64, 67, 135)",
  "rgb(52, 94, 141)",
  "rgb(41, 120, 142)",
  "rgb(32, 144, 140)",
  "rgb(34, 167, 132)",
  "rgb(68, 190, 112)",
  "rgb(121, 209, 81)",
  "rgb(189, 222, 38)",
  "rgb(253, 231, 36)",
];

export function getHeatmapStops(): string[] {
  if (typeof window === "undefined") return FALLBACK_STOPS;
  const cs = getComputedStyle(document.documentElement);
  const stops: string[] = [];
  for (let i = 0; i < STOP_COUNT; i++) {
    const v = cs.getPropertyValue(`--heatmap-${i}`).trim();
    stops.push(v.length > 0 ? v : FALLBACK_STOPS[i]);
  }
  return stops;
}

export function getSurfaceColor(): string {
  if (typeof window === "undefined") return "#252525";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--surface")
    .trim();
  return v.length > 0 ? v : "#252525";
}

// Picks the discrete stop closest to the normalized intensity. We don't
// interpolate between stops here because (a) the CSS variable values may be
// hex/named colors that aren't trivially lerpable, and (b) discrete cells
// already read fine at 11 levels.
export function rampColor(t: number, stops: string[] = getHeatmapStops()): string {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = Math.round(clamped * (stops.length - 1));
  return stops[idx];
}

// Backward-compat: surface color used to live as a constant. Kept as a getter
// for callers that imported the symbol; new callers should use getSurfaceColor().
export const SURFACE_COLOR = "#252525";

export function cellColor(
  intensity: number,
  max: number,
  stops?: string[],
): string {
  if (intensity <= 0 || max <= 0) {
    return getSurfaceColor();
  }
  return rampColor(intensity / max, stops);
}
