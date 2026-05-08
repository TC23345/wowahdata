// Centralized gold formatters. Callers depend on:
//   - sign-aware optional `signed` prefix (e.g. "+12.3kg" / "-5g")
//   - kg threshold at |g| >= 10_000 ( 10_000g => "10.0kg" )
//   - 100g threshold for whole-gold display ( >= 100g => no decimals )
//   - silver fallback for sub-gold values ( |g| < 1 && != 0 => "12s" )

export function fmtGold(g: number, signed = false): string {
  if (g === 0) return "0g";
  const sign = signed && g > 0 ? "+" : "";
  const abs = Math.abs(g);
  if (abs >= 10_000) return `${sign}${(g / 1000).toFixed(1)}kg`;
  if (abs >= 100) return `${sign}${g.toFixed(0)}g`;
  if (abs < 1) return `${sign}${(g * 100).toFixed(0)}s`;
  return `${sign}${g.toFixed(2)}g`;
}

export function fmtGoldFull(g: number, signed = false): string {
  const sign = signed && g > 0 ? "+" : "";
  return `${sign}${Math.round(g).toLocaleString()}g`;
}
