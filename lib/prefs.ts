// Per-viewer conveniences kept in localStorage: table sorts, pinned items and
// the last view chosen on each page. Storage can be unavailable (private
// windows, blocked site data), so every access is guarded and the app works
// without it.

const PREFIX = "wowahdata:";

export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the preference lasts for this page view only.
  }
}

/** Pins are per dataset, capped like the auction house's favourites. */
export const MAX_PINS = 20;

export function pinsKey(realm: string): string {
  return `pins:${realm}`;
}

export function togglePinIn(pins: string[], name: string): string[] {
  if (pins.includes(name)) return pins.filter((p) => p !== name);
  if (pins.length >= MAX_PINS) return pins;
  return [...pins, name];
}

/** Two-key sort: clicking a column makes it primary and keeps the previous primary as tie-breaker. */
export type SortKey = { id: string; dir: "asc" | "desc" };

export function nextSort(current: SortKey[], id: string): SortKey[] {
  const [primary] = current;
  if (primary?.id === id) return [{ id, dir: primary.dir === "desc" ? "asc" : "desc" }, ...current.slice(1, 2)];
  const rest = current.filter((s) => s.id !== id);
  return [{ id, dir: "desc" }, ...rest.slice(0, 1)];
}
