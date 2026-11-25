// Copper-precision money formatting.
//
// WoW stores money as an integer number of copper: 100 copper = 1 silver,
// 100 silver = 1 gold. Forever keeps copper precision on the auction house, and
// launch-era unit prices are a few silver, so a fixed two-decimal gold format
// would hide most of a price. The rules (docs/forever/05-block-catalog.md §6):
//
//   under 1s     → copper only            47c
//   under 1g     → silver and copper      8s 40c
//   under 100g   → gold and silver        6g 52s
//   under 10kg   → whole gold             1,234g
//   10,000g+     → thousands of gold      33.7k g
//
// Output length is bounded (at most ~9 characters plus sign), which is what lets
// money sit in fixed-width table columns and readout slots.

export const COPPER_PER_SILVER = 100;
export const COPPER_PER_GOLD = 10_000;

export type MoneyUnit = "g" | "s" | "c" | "k g";
export type MoneyPart = { value: string; unit: MoneyUnit };

const MINUS = "−";

function withSeparators(n: number): string {
  return n.toLocaleString("en-US");
}

/** Split a non-negative copper amount into the parts that should be shown. */
export function moneyParts(copper: number): MoneyPart[] {
  const c = Math.round(Math.abs(copper));
  if (c >= 10_000 * COPPER_PER_GOLD) {
    return [{ value: (c / COPPER_PER_GOLD / 1000).toFixed(1), unit: "k g" }];
  }
  if (c >= 100 * COPPER_PER_GOLD) {
    return [{ value: withSeparators(Math.floor(c / COPPER_PER_GOLD)), unit: "g" }];
  }
  if (c >= COPPER_PER_GOLD) {
    const g = Math.floor(c / COPPER_PER_GOLD);
    const s = Math.floor((c % COPPER_PER_GOLD) / COPPER_PER_SILVER);
    return [
      { value: String(g), unit: "g" },
      { value: String(s).padStart(2, "0"), unit: "s" },
    ];
  }
  if (c >= COPPER_PER_SILVER) {
    const s = Math.floor(c / COPPER_PER_SILVER);
    const cc = c % COPPER_PER_SILVER;
    return [
      { value: String(s), unit: "s" },
      { value: String(cc).padStart(2, "0"), unit: "c" },
    ];
  }
  return [{ value: String(c), unit: "c" }];
}

export type SignMode = "auto" | "always";

/** Sign prefix for a copper amount: "−" for negatives, "+" for positives when asked. */
export function moneySign(copper: number, sign: SignMode = "auto"): string {
  if (Math.round(copper) < 0) return MINUS;
  if (sign === "always" && Math.round(copper) > 0) return "+";
  return "";
}

/** Plain-text form, e.g. "6g 52s", "−9,691g", "33.7k g". */
export function formatMoney(copper: number, sign: SignMode = "auto"): string {
  const parts = moneyParts(copper);
  const body = parts
    .map((p) => (p.unit === "k g" ? `${p.value}k g` : `${p.value}${p.unit}`))
    .join(" ");
  return moneySign(copper, sign) + body;
}

/** Every non-zero denomination, for hover text: "1,234g 56s 78c". */
export function formatMoneyExact(copper: number): string {
  const c = Math.round(Math.abs(copper));
  const g = Math.floor(c / COPPER_PER_GOLD);
  const s = Math.floor((c % COPPER_PER_GOLD) / COPPER_PER_SILVER);
  const cc = c % COPPER_PER_SILVER;
  const parts = [g ? `${withSeparators(g)}g` : "", s ? `${s}s` : "", cc || c === 0 ? `${cc}c` : ""].filter(Boolean);
  return moneySign(copper) + parts.join(" ");
}

/** Axis tick value and the unit to name in the axis title, chosen per axis. */
export function axisUnitFor(maxCopper: number): { unit: "g" | "s" | "c"; divisor: number } {
  if (maxCopper >= COPPER_PER_GOLD) return { unit: "g", divisor: COPPER_PER_GOLD };
  if (maxCopper >= COPPER_PER_SILVER) return { unit: "s", divisor: COPPER_PER_SILVER };
  return { unit: "c", divisor: 1 };
}
