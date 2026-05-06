import type { LoadedData } from "./csv";
import { displayName } from "./items";

export type SellThroughRow = {
  name: string;
  isSynthetic: boolean;
  soldRows: number;
  soldUnits: number;
  expiredRows: number;
  expiredUnits: number;
  rate: number; // sold rows / (sold rows + expired rows); 0 when neither
};

export const SLOW_THRESHOLD = 0.5;

export function buildSellThrough(loaded: LoadedData): SellThroughRow[] {
  const map = new Map<string, SellThroughRow>();
  const ensure = (rowName: string, isSynth: boolean): SellThroughRow => {
    const name = isSynth ? "DE Gear (random enchant)" : rowName;
    let r = map.get(name);
    if (!r) {
      r = {
        name,
        isSynthetic: isSynth,
        soldRows: 0,
        soldUnits: 0,
        expiredRows: 0,
        expiredUnits: 0,
        rate: 0,
      };
      map.set(name, r);
    }
    return r;
  };

  for (const s of loaded.sales) {
    const r = ensure(displayName(s), s.itemName === "?");
    r.soldRows += 1;
    r.soldUnits += s.quantity;
  }
  for (const e of loaded.expired) {
    const r = ensure(displayName(e), e.itemName === "?");
    r.expiredRows += 1;
    r.expiredUnits += e.quantity;
  }

  const out = [...map.values()];
  for (const r of out) {
    const denom = r.soldRows + r.expiredRows;
    r.rate = denom === 0 ? 0 : r.soldRows / denom;
  }
  return out.sort((a, b) => b.soldUnits - a.soldUnits);
}
