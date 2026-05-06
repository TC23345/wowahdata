import type { TsmKind } from "./csv";

// Realm names can contain letters, digits, spaces, apostrophes, and hyphens
// (e.g. Mal'Ganis, Earthen Ring, Area-52).
const FILE_RE =
  /^Accounting_([A-Za-z0-9'\- ]+)_(purchases|sales|expired|canceled|income|expenses)\.csv$/;

export type RealmFile = { realm: string; kind: TsmKind };

export function realmFromFilename(name: string): RealmFile | null {
  const m = FILE_RE.exec(name);
  if (!m) return null;
  return { realm: m[1], kind: m[2] as TsmKind };
}
