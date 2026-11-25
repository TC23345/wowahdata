// Coin-coloured money display.
//
// Modelled on the auction house's money display in the WoW: Forever client:
// gold / silver / copper each marked by its coin colour, zero denominations
// hidden, and — in tables — each denomination in its own fixed-width slot so
// digits line up down a column. Rendered as text with coloured unit letters
// rather than coin textures, following the bounded-length rules in
// lib/money.ts, with the exact value on hover. Original code.

import { formatMoneyExact, moneyParts, moneySign, type MoneyUnit, type SignMode } from "@/lib/money";

const UNIT_COLOR: Record<MoneyUnit, string> = {
  g: "var(--coin-gold)",
  "k g": "var(--coin-gold)",
  s: "var(--coin-silver)",
  c: "var(--coin-copper)",
};

type Props = {
  copper: number;
  sign?: SignMode;
  /** Colour the whole value as profit/loss instead of colouring coin letters. */
  tone?: "pnl";
  /**
   * Table mode: gold, silver and copper each get a fixed slot (gold right-aligned
   * in whatever width remains), so values line up by denomination down a column.
   */
  align?: boolean;
  className?: string;
};

export function Money({ copper, sign = "auto", tone, align, className }: Props) {
  const parts = moneyParts(copper);
  const toneColor = tone === "pnl" ? (copper > 0 ? "var(--profit)" : copper < 0 ? "var(--loss-text)" : undefined) : undefined;
  const signText = moneySign(copper, sign);
  const unit = (u: MoneyUnit) => <span style={toneColor ? undefined : { color: UNIT_COLOR[u] }}>{u}</span>;
  const title = formatMoneyExact(copper);

  if (align) {
    const slot = (u: "gold" | "s" | "c") => {
      const p = parts.find((x) => (u === "gold" ? x.unit === "g" || x.unit === "k g" : x.unit === u));
      return p ? (
        <>
          {p.value}
          {unit(p.unit)}
        </>
      ) : null;
    };
    return (
      <span
        title={title}
        className={`inline-grid w-full grid-cols-[minmax(0,1fr)_3.6ch_3.6ch] whitespace-nowrap text-right tabular-nums ${className ?? ""}`}
        style={toneColor ? { color: toneColor } : undefined}
      >
        <span className="truncate">
          {signText}
          {slot("gold")}
        </span>
        <span>{slot("s")}</span>
        <span>{slot("c")}</span>
      </span>
    );
  }

  return (
    <span title={title} className={`whitespace-nowrap tabular-nums ${className ?? ""}`} style={toneColor ? { color: toneColor } : undefined}>
      {signText}
      {parts.map((p, i) => (
        <span key={p.unit}>
          {i > 0 ? " " : ""}
          {p.value}
          {unit(p.unit)}
        </span>
      ))}
    </span>
  );
}
