import type { TsmKind } from "./csv";

// Realm names can contain letters, digits, spaces, apostrophes, and hyphens
// (e.g. Mal'Ganis, Earthen Ring, Area-52).
const REALM = "[A-Za-z0-9'\\- ]+";

// TSM addon export: Accounting_<Realm>_<kind>.csv
const ADDON_RE = new RegExp(
  `^Accounting_(${REALM})_(purchases|sales|expired|canceled|income|expenses)\\.csv$`,
);

// TSM desktop app "Data Export": TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv
const DESKTOP_RE = new RegExp(
  `^TSM_(${REALM})_(Sales|Buys|Cancelled|Expired|Income|Expense)_\\d{4}-\\d{2}-\\d{2}\\.csv$`,
);

const DESKTOP_KIND: Record<string, TsmKind> = {
  Sales: "sales",
  Buys: "purchases",
  Cancelled: "canceled",
  Expired: "expired",
  Income: "income",
  Expense: "expenses",
};

export const ACCEPTED_FILENAME_PATTERNS = [
  "Accounting_<Realm>_<kind>.csv",
  "TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv",
] as const;

export type RealmFile = { realm: string; kind: TsmKind };

export function realmFromFilename(name: string): RealmFile | null {
  const addon = ADDON_RE.exec(name);
  if (addon) return { realm: addon[1], kind: addon[2] as TsmKind };
  const desktop = DESKTOP_RE.exec(name);
  if (desktop) return { realm: desktop[1], kind: DESKTOP_KIND[desktop[2]] };
  return null;
}
