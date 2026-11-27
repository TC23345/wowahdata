"use client";

import { extractExportCsvs, isZipName } from "./export-files";
import type { FileInput } from "./load";
import { realmFromFilename } from "./realm";

// Read dropped/picked files. Zips are opened and their Data Export CSVs used;
// anything that isn't a Data Export CSV is skipped.
export async function readFileInputs(files: File[]): Promise<FileInput[]> {
  const out: FileInput[] = [];
  for (const f of files) {
    if (isZipName(f.name)) {
      out.push(...extractExportCsvs(new Uint8Array(await f.arrayBuffer())));
    } else if (realmFromFilename(f.name)) {
      out.push({ name: f.name, text: await f.text() });
    }
  }
  return out;
}
