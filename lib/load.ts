import { type LoadedData, type TsmKind } from "./csv";
import { buildLoadedData, parseByKind, type ParsedKindResult } from "./parse";
import { realmFromFilename } from "./realm";

export type FileInput = { name: string; text: string };

export type LoadResult =
  | { ok: true; data: LoadedData }
  | { ok: false; error: string };

// Take a set of TSM CSV files (any subset of the six kinds) and return one
// LoadedData. Multiple realms are rejected — caller should split first.
export function loadFiles(files: FileInput[]): LoadResult {
  if (files.length === 0) return { ok: false, error: "No files provided" };

  let realm: string | null = null;
  const accum: ParsedKindResult = {};
  const seen = new Set<TsmKind>();

  for (const f of files) {
    const meta = realmFromFilename(f.name);
    if (!meta) {
      return {
        ok: false,
        error: `Unrecognized filename: ${f.name}. Expected Accounting_<Realm>_<kind>.csv`,
      };
    }
    if (realm === null) realm = meta.realm;
    else if (realm !== meta.realm) {
      return {
        ok: false,
        error: `Multiple realms in one batch (${realm}, ${meta.realm}). Split by realm first.`,
      };
    }
    if (seen.has(meta.kind)) {
      return { ok: false, error: `Duplicate file for kind: ${meta.kind}` };
    }
    seen.add(meta.kind);
    Object.assign(accum, parseByKind(meta.kind, f.text));
  }

  return { ok: true, data: buildLoadedData(realm!, accum) };
}
