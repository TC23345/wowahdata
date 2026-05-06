// Discrete viridis-like ramp. Hand-rolled to avoid pulling in d3-scale-chromatic.
// Stops sampled from the viridis colormap at evenly-spaced t values.
const STOPS: Array<[number, number, number]> = [
  [68, 1, 84],     // t=0.00 — deep purple
  [72, 35, 116],   // t=0.20
  [64, 67, 135],   // t=0.30
  [52, 94, 141],   // t=0.40
  [41, 120, 142],  // t=0.50 — teal
  [32, 144, 140],  // t=0.60
  [34, 167, 132],  // t=0.70
  [68, 190, 112],  // t=0.80
  [121, 209, 81],  // t=0.85 — green
  [189, 222, 38],  // t=0.92
  [253, 231, 36],  // t=1.00 — yellow
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function viridis(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (STOPS.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  if (i >= STOPS.length - 1) {
    const [r, g, b] = STOPS[STOPS.length - 1];
    return `rgb(${r}, ${g}, ${b})`;
  }
  const [r1, g1, b1] = STOPS[i];
  const [r2, g2, b2] = STOPS[i + 1];
  const r = Math.round(lerp(r1, r2, f));
  const g = Math.round(lerp(g1, g2, f));
  const b = Math.round(lerp(b1, b2, f));
  return `rgb(${r}, ${g}, ${b})`;
}

// Returns the cell color OR the surface color when the cell is empty.
// "No data" must look different from "sold zero."
export const SURFACE_COLOR = "#252525";

export function cellColor(intensity: number, max: number): string {
  if (intensity <= 0 || max <= 0) return SURFACE_COLOR;
  return viridis(intensity / max);
}
