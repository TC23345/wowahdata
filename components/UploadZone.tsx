"use client";

import { useCallback, useRef, useState } from "react";
import { ACCEPTED_FILENAME_PATTERN, realmFromFilename } from "@/lib/realm";
import { loadFromDroppedFiles } from "@/lib/client-load";
import type { LoadedData } from "@/lib/csv";

type Props = {
  onLoaded: (data: LoadedData) => void;
};

export function UploadZone({ onLoaded }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      const valid = files.filter((f) => realmFromFilename(f.name));
      if (valid.length === 0) {
        setError(
          `Drop one or more TSM desktop Data Export files named ${ACCEPTED_FILENAME_PATTERN}`,
        );
        return;
      }
      setBusy(true);
      const result = await loadFromDroppedFiles(valid);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLoaded(result.data);
    },
    [onLoaded],
  );

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
            ? "border-[#5dcaa5] bg-[#1f2a26]"
            : "border-[#444] bg-[#1a1a1a] hover:border-[#666]"
        }`}
      >
        <p className="text-base text-[#e0e0e0]">
          Drop your TSM Forever export here
        </p>
        <p className="max-w-md text-xs text-[#999]">
          In the TSM desktop app, open Data Export, pick Game Mode
          &ldquo;Forever&rdquo; and your realm, then unzip and drop the{" "}
          <code className="rounded bg-[#252525] px-1 py-0.5 text-[10px] text-[#e0e0e0]">TSM_&lt;Realm&gt;_&lt;Kind&gt;_&lt;YYYY-MM-DD&gt;.csv</code>{" "}
          files. Any subset works. Your data never leaves your browser — parsed in-page,
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
          className="rounded border border-[#444] bg-[#252525] px-3 py-1.5 text-sm text-[#e0e0e0] hover:border-[#666]"
        >
          Browse files…
        </button>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded border border-[#5a2526] bg-[#2a1010] px-3 py-2 text-xs text-[#e24b4a]"
        >
          {error}
        </p>
      )}

      {busy && (
        <p className="text-xs text-[#999]">Parsing your TSM export…</p>
      )}
    </section>
  );
}
