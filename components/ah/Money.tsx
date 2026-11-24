// Coin-coloured money display.
//
// Modelled on the auction house's money frame in the WoW: Forever client
// (gold / silver / copper, each denomination marked by its coin colour), but
// rendered as text with coloured unit letters rather than coin textures, and
// following this app's bounded-length rules in lib/money.ts. Original code.

import { moneyParts, moneySign, type MoneyUnit, type SignMode } from "@/lib/money";

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
  className?: string;
};

export function Money({ copper, sign = "auto", tone, className }: Props) {
  const parts = moneyParts(copper);
  const toneColor =
    tone === "pnl" ? (copper > 0 ? "var(--profit)" : copper < 0 ? "var(--loss-text)" : undefined) : undefined;
  return (
    <span className={`whitespace-nowrap tabular-nums ${className ?? ""}`} style={toneColor ? { color: toneColor } : undefined}>
      {moneySign(copper, sign)}
      {parts.map((p, i) => (
        <span key={p.unit}>
          {i > 0 ? " " : ""}
          {p.value}
          <span style={toneColor ? undefined : { color: UNIT_COLOR[p.unit] }}>{p.unit === "k g" ? "k g" : p.unit}</span>
        </span>
      ))}
    </span>
  );
}
