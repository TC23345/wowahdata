"use client";

import { del, get, set } from "idb-keyval";
import { extractExportCsvs, isZipName, pickLatestExport } from "./export-files";
import type { FileInput } from "./load";
import { parseExportFilename } from "./realm";
import { EXPORT_FOLDER_KEY as HANDLE_KEY } from "./storage";

// "Detect TSM export": the browser cannot read a disk path on its own, so
// this uses the File System Access API (Chrome / Edge). The first click opens
// a folder picker that starts in the user's Desktop on Windows, macOS and
// Linux; the user grants read access once, the folder handle is remembered in
// IndexedDB, and later clicks rescan it. Nothing leaves the browser.

const PICKER_ID = "wowahdata-tsm-export";

// Parts of the File System Access API that TypeScript's DOM lib omits.
type PermissionMode = { mode: "read" };
type DirHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterableIterator<FileSystemHandle>;
  queryPermission(d: PermissionMode): Promise<PermissionState>;
  requestPermission(d: PermissionMode): Promise<PermissionState>;
};
type PickerWindow = Window & {
  showDirectoryPicker(opts: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: "desktop" | "documents" | "downloads" | FileSystemHandle;
  }): Promise<FileSystemDirectoryHandle>;
};

export function supportsFolderDetect(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function rememberedFolderName(): Promise<string | null> {
  try {
    const h = (await get(HANDLE_KEY)) as FileSystemDirectoryHandle | undefined;
    return h?.name ?? null;
  } catch {
    return null;
  }
}

export async function forgetFolder(): Promise<void> {
  await del(HANDLE_KEY);
}

export type DetectResult =
  | { kind: "found"; folder: string; realm: string; date: string; files: FileInput[] }
  | { kind: "none"; folder: string }
  | { kind: "cancelled" };

async function pickFolder(): Promise<DirHandle> {
  const h = await (window as unknown as PickerWindow).showDirectoryPicker({
    id: PICKER_ID,
    mode: "read",
    startIn: "desktop",
  });
  await set(HANDLE_KEY, h);
  return h as DirHandle;
}

// Must be called from a click handler: requestPermission and the picker both
// need a user gesture.
export async function detectExport(opts: { choose?: boolean } = {}): Promise<DetectResult> {
  let dir: DirHandle | null = null;
  try {
    if (!opts.choose) {
      const saved = (await get(HANDLE_KEY)) as DirHandle | undefined;
      if (saved) {
        let perm = await saved.queryPermission({ mode: "read" });
        if (perm === "prompt") perm = await saved.requestPermission({ mode: "read" });
        if (perm === "granted") dir = saved;
      }
    }
    dir ??= await pickFolder();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { kind: "cancelled" };
    throw e;
  }

  // Top level of the folder only: loose CSVs, plus zips named TSM*.zip (the
  // Desktop can hold plenty of unrelated zips that are not worth opening).
  const csvs = new Map<string, File>();
  const fromZips = new Map<string, { input: FileInput; lastModified: number }>();
  for await (const entry of dir.values()) {
    if (entry.kind !== "file") continue;
    const name = entry.name;
    if (parseExportFilename(name)) {
      csvs.set(name, await (entry as FileSystemFileHandle).getFile());
    } else if (isZipName(name) && /^tsm/i.test(name)) {
      const zip = await (entry as FileSystemFileHandle).getFile();
      for (const input of extractExportCsvs(new Uint8Array(await zip.arrayBuffer()))) {
        const prev = fromZips.get(input.name);
        if (!prev || zip.lastModified > prev.lastModified) {
          fromZips.set(input.name, { input, lastModified: zip.lastModified });
        }
      }
    }
  }

  const candidates = [
    ...[...csvs.values()].map((f) => ({ name: f.name, lastModified: f.lastModified })),
    ...[...fromZips.values()].map((z) => ({ name: z.input.name, lastModified: z.lastModified })),
  ];
  const pick = pickLatestExport(candidates);
  if (!pick) return { kind: "none", folder: dir.name };

  // A loose CSV wins over the same file inside a zip.
  const files: FileInput[] = [];
  for (const name of pick.names) {
    const loose = csvs.get(name);
    files.push(loose ? { name, text: await loose.text() } : fromZips.get(name)!.input);
  }
  return { kind: "found", folder: dir.name, realm: pick.realm, date: pick.date, files };
}
