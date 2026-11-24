import type { ReactNode } from "react";
import type { BlockSlot, Chrome } from "@/components/shell/BlockShell";
import type { BlockCtx } from "./context";

export type BlockProps = { slot: BlockSlot; ctx: BlockCtx; stale: boolean };

/** A view of a primary chart: draws into the chart's box, with the view switcher first in its toolbar. */
export type ViewProps = BlockProps & { viewSwitch: ReactNode; title: string };

/** Every primary chart has all four zones in every view, so switching views never changes the anatomy. */
export const PRIMARY_CHROME: Chrome = { toolbar: true, readout: true, footer: true };

export const DAYS_TUE_FIRST = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"] as const;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Tue 19:00" for a slot index in a Tue-first 7×24 week grid. */
export function slotLabel(slot: number): string {
  const s = ((slot % 168) + 168) % 168;
  return `${DAYS_TUE_FIRST[Math.floor(s / 24)]} ${pad2(s % 24)}:00`;
}

export function pct(x: number | null, digits = 0): string {
  if (x == null) return "—";
  const s = `${(Math.abs(x) * 100).toFixed(digits)}%`;
  return x < 0 && Number(s.slice(0, -1)) !== 0 ? `\u2212${s}` : s;
}

export function units(n: number): string {
  return n.toLocaleString("en-US");
}

export function tzLabel(tz: "utc" | "local"): string {
  if (tz === "utc") return "UTC";
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "local";
  } catch {
    return "local";
  }
}
