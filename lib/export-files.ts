import { unzipSync } from "fflate";
import type { FileInput } from "./load";
import { parseExportFilename } from "./realm";

// Helpers shared by drag-and-drop and the "Detect TSM export" button. Pure
// (no DOM), so they run in Vitest.

export function isZipName(name: string): boolean {
  return /\.zip$/i.test(name);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

// The TSM desktop app often zips its six CSVs. Return the zip's Data Export
// CSVs (at any depth inside the zip), keyed by their bare filename. Other
// entries are skipped without being decompressed.
export function extractExportCsvs(zip: Uint8Array): FileInput[] {
  const entries = unzipSync(zip, {
    filter: (f) => parseExportFilename(basename(f.name)) !== null,
  });
  const decoder = new TextDecoder("utf-8");
  return Object.entries(entries).map(([path, bytes]) => ({
    name: basename(path),
    text: decoder.decode(bytes),
  }));
}

export type ExportCandidate = { name: string; lastModified: number };

export type ExportSet = {
  realm: string;
  date: string;
  names: string[];
};

// A folder like the Desktop can hold several exports (older dates, other
// realms). Choose one realm's newest export: latest filename date first,
// then the set with the most of the six kinds, then the most recently
// written files. Within a set, one file per kind (newest write wins).
export function pickLatestExport(files: ExportCandidate[]): ExportSet | null {
  type Group = {
    realm: string;
    date: string;
    byKind: Map<string, ExportCandidate>;
    newest: number;
  };
  const groups = new Map<string, Group>();
  for (const f of files) {
    const meta = parseExportFilename(f.name);
    if (!meta) continue;
    const key = `${meta.date}\u0000${meta.realm}`;
    let g = groups.get(key);
    if (!g) {
      g = { realm: meta.realm, date: meta.date, byKind: new Map(), newest: 0 };
      groups.set(key, g);
    }
    const prev = g.byKind.get(meta.kind);
    if (!prev || f.lastModified > prev.lastModified) g.byKind.set(meta.kind, f);
    g.newest = Math.max(g.newest, f.lastModified);
  }
  let best: Group | null = null;
  for (const g of groups.values()) {
    if (
      !best ||
      g.date > best.date ||
      (g.date === best.date &&
        (g.byKind.size > best.byKind.size ||
          (g.byKind.size === best.byKind.size && g.newest > best.newest)))
    ) {
      best = g;
    }
  }
  if (!best) return null;
  return {
    realm: best.realm,
    date: best.date,
    names: [...best.byKind.values()].map((f) => f.name).sort(),
  };
}
