import type { TsmKind } from "./csv";

// wowahdata targets WoW Forever. The only accepted input is the TSM desktop
// app's Data Export (TSM › Data Export, Game Mode "Forever"), which writes:
//   TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv
// Realm names can contain letters, digits, spaces, apostrophes, and hyphens
// (e.g. PvP, Mal'Ganis, Earthen Ring, Area-52).
const DESKTOP_RE =
  /^TSM_([A-Za-z0-9'\- ]+)_(Sales|Buys|Cancelled|Expired|Income|Expense)_(\d{4}-\d{2}-\d{2})\.csv$/;

const DESKTOP_KIND: Record<string, TsmKind> = {
  Sales: "sales",
  Buys: "purchases",
  Cancelled: "canceled",
  Expired: "expired",
  Income: "income",
  Expense: "expenses",
};

export const ACCEPTED_FILENAME_PATTERN = "TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv";

export type RealmFile = { realm: string; kind: TsmKind };
export type ExportFile = RealmFile & { date: string };

// Full parse of a Data Export filename, including its YYYY-MM-DD stamp.
export function parseExportFilename(name: string): ExportFile | null {
  const m = DESKTOP_RE.exec(name);
  if (!m) return null;
  return { realm: m[1], kind: DESKTOP_KIND[m[2]], date: m[3] };
}

export function realmFromFilename(name: string): RealmFile | null {
  const f = parseExportFilename(name);
  return f && { realm: f.realm, kind: f.kind };
}
