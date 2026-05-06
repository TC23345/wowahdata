// WoW reset is Tuesday — trading weeks run Tue → Mon.
// Sun=0, Mon=1, Tue=2, ..., Sat=6
const TUESDAY = 2;

export function weekStartTuesday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const daysSinceTue = (out.getDay() - TUESDAY + 7) % 7;
  out.setDate(out.getDate() - daysSinceTue);
  return out;
}

export function weekEndMonday(d: Date): Date {
  const start = weekStartTuesday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}

// Day-of-week labels in the trading-week order (Tue first).
export const TRADING_WEEK_DAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"] as const;

export type TradingDay = (typeof TRADING_WEEK_DAYS)[number];

// Map JS getDay() (Sun=0..Sat=6) to the index 0..6 in TRADING_WEEK_DAYS (Tue=0..Mon=6).
export function tradingDayIndex(date: Date): number {
  return (date.getDay() - TUESDAY + 7) % 7;
}

export function listWeekStartsInRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let cursor = weekStartTuesday(start);
  while (cursor <= end) {
    out.push(new Date(cursor));
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}
