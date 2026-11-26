"use client";

import { loadFiles, type FileInput, type LoadResult } from "./load";

export async function loadFromDroppedFiles(
  files: File[],
): Promise<LoadResult> {
  const inputs: FileInput[] = await Promise.all(
    files.map(async (f) => ({ name: f.name, text: await f.text() })),
  );
  return loadFiles(inputs);
}
