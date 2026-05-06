import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "wowahdata — TSM accounting dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CELLS = [
  // Tue–Mon × 24 hours of synthetic-but-evocative AH heat.
  // Higher numbers = hotter cells, mostly weekend evenings.
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 4, 5, 6, 8, 12, 16, 22, 28, 24, 16, 9, 4, 1],
  [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 5, 6, 7, 9, 13, 18, 24, 30, 26, 18, 10, 5, 1],
  [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 20, 26, 32, 28, 20, 11, 5, 2],
  [0, 0, 0, 0, 0, 0, 1, 3, 4, 6, 7, 8, 9, 11, 15, 19, 26, 34, 42, 36, 24, 14, 7, 3],
  [1, 0, 0, 0, 0, 1, 2, 4, 6, 8, 10, 11, 13, 16, 19, 23, 28, 35, 40, 38, 28, 18, 10, 5],
  [2, 1, 0, 0, 1, 2, 3, 5, 7, 9, 11, 13, 16, 19, 23, 27, 30, 32, 30, 26, 20, 14, 8, 4],
  [1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 22, 18, 12, 6, 3, 1],
];

const VIRIDIS = [
  [68, 1, 84],
  [64, 67, 135],
  [41, 120, 142],
  [34, 167, 132],
  [121, 209, 81],
  [253, 231, 36],
];

function color(intensity: number, max: number): string {
  if (intensity <= 0) return "#252525";
  const t = Math.min(1, intensity / max);
  const scaled = t * (VIRIDIS.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[Math.min(VIRIDIS.length - 1, i + 1)];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

export default function OG() {
  const max = Math.max(...CELLS.flat());
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a1a1a",
          color: "#e0e0e0",
          fontFamily: "system-ui, sans-serif",
          padding: 64,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -0.5 }}>
            wowahdata
          </div>
          <div style={{ fontSize: 26, color: "#999" }}>
            When does your AH actually clear?
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "#252525",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 24,
          }}
        >
          {CELLS.map((row, di) => (
            <div key={di} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ width: 36, color: "#999", fontSize: 16 }}>
                {["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"][di]}
              </div>
              {row.map((v, hi) => (
                <div
                  key={hi}
                  style={{
                    width: 38,
                    height: 38,
                    background: color(v, max),
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 18, color: "#5dcaa5" }}>
          Drop your TSM CSVs · your data never leaves your browser
        </div>
      </div>
    ),
    size,
  );
}
