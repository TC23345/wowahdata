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

const SAMPLE_FILES = [
  "Accounting_Nightslayer_purchases.csv",
  "Accounting_Nightslayer_sales.csv",
  "Accounting_Nightslayer_expired.csv",
  "Accounting_Nightslayer_canceled.csv",
  "Accounting_Nightslayer_income.csv",
  "Accounting_Nightslayer_expenses.csv",
];

export async function loadSampleData(): Promise<LoadResult> {
  const inputs: FileInput[] = await Promise.all(
    SAMPLE_FILES.map(async (name) => {
      const r = await fetch(`/sample/${name}`);
      if (!r.ok) throw new Error(`Failed to fetch /sample/${name}: ${r.status}`);
      return { name, text: await r.text() };
    }),
  );
  return loadFiles(inputs);
}
