import { describe, it, expect } from "vitest";
import {
  TRADING_WEEK_DAYS,
  tradingDayIndex,
  weekStartTuesday,
} from "../weeks";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("Tue–Mon week math", () => {
  it("a Tuesday returns itself at 00:00", () => {
    const d = new Date(2026, 3, 7, 12, 0, 0); // Apr 7 2026 is a Tuesday (local)
    const start = weekStartTuesday(d);
    expect(ymd(start)).toBe("2026-04-07");
    expect(start.getHours()).toBe(0);
  });

  it("a Monday returns the prior Tuesday (six days back)", () => {
    const d = new Date(2026, 3, 6, 23, 59, 59); // Apr 6 2026 (Mon)
    const start = weekStartTuesday(d);
    expect(ymd(start)).toBe("2026-03-31");
  });

  it("a Sunday returns the previous Tuesday", () => {
    const d = new Date(2026, 3, 5, 9, 0, 0); // Apr 5 2026 (Sun)
    const start = weekStartTuesday(d);
    expect(ymd(start)).toBe("2026-03-31");
  });

  it("trading day order is Tue, Wed, ..., Mon", () => {
    expect([...TRADING_WEEK_DAYS]).toEqual([
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
      "Mon",
    ]);
  });

  it("tradingDayIndex maps weekday → 0..6 with Tue=0", () => {
    expect(tradingDayIndex(new Date(2026, 3, 7))).toBe(0); // Tue
    expect(tradingDayIndex(new Date(2026, 3, 8))).toBe(1); // Wed
    expect(tradingDayIndex(new Date(2026, 3, 6))).toBe(6); // Mon
    expect(tradingDayIndex(new Date(2026, 3, 5))).toBe(5); // Sun
  });
});
