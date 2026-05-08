"use client";

import { useCallback, useRef, useState } from "react";
import { realmFromFilename } from "@/lib/realm";
import { loadFromDroppedFiles, loadSampleData } from "@/lib/client-load";
import type { LoadedData } from "@/lib/csv";

type Props = {
  onLoaded: (data: LoadedData) => void;
};

export function UploadZone({ onLoaded }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "parsing" | "sample">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      const valid = files.filter((f) => realmFromFilename(f.name));
      if (valid.length === 0) {
        setError(
          "Drop one or more files matching Accounting_<Realm>_<kind>.csv",
        );
        return;
      }
      setBusy("parsing");
      const result = await loadFromDroppedFiles(valid);
      setBusy("idle");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLoaded(result.data);
    },
    [onLoaded],
  );

  const onSample = useCallback(async () => {
    setError(null);
    setBusy("sample");
    try {
      const r = await loadSampleData();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onLoaded(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("idle");
    }
  }, [onLoaded]);

  return (
    <section className="flex flex-col gap-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(Array.from(e.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center transition-colors ${
          dragActive
            ? "border-accent bg-accent-soft"
            : "border-border-strong bg-background hover:border-text-muted"
        }`}
      >
        <p className="text-base text-text-primary">
          Drop your TSM CSV exports here
        </p>
        <p className="max-w-md text-xs text-text-secondary">
          Files matching <code className="rounded bg-surface px-1 py-0.5 text-[10px] text-text-primary">Accounting_&lt;Realm&gt;_&lt;kind&gt;.csv</code>.
          Any subset works. Your data never leaves your browser — parsed in-page,
          stored locally in IndexedDB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 0) handleFiles(files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary hover:border-text-muted"
        >
          Browse files…
        </button>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSample}
          disabled={busy !== "idle"}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:opacity-90 disabled:opacity-50"
        >
          {busy === "sample" ? "Loading sample…" : "Load sample data"}
        </button>
        <p className="text-xs text-text-muted">
          Uses a scrubbed Nightslayer export — Jan 21 to May 6, 2026 (8,510 sales rows).
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-danger-border bg-danger-soft px-3 py-2 text-xs text-loss"
        >
          {error}
        </p>
      )}

      {busy === "parsing" && (
        <p className="text-xs text-text-secondary">Parsing your TSM export…</p>
      )}
    </section>
  );
}
