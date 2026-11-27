"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ACCEPTED_FILENAME_PATTERN } from "@/lib/realm";
import { readFileInputs } from "@/lib/client-load";
import { loadFiles, type FileInput } from "@/lib/load";
import {
  detectExport,
  rememberedFolderName,
  supportsFolderDetect,
} from "@/lib/folder-detect";
import type { LoadedData } from "@/lib/csv";

type Props = {
  onLoaded: (data: LoadedData) => void;
};

const noSubscribe = () => () => {};

const CODE =
  "rounded bg-[#252525] px-1 py-0.5 text-[10px] text-[#e0e0e0]";

export function UploadZone({ onLoaded }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "parsing" | "detecting">(null);
  // null during server render: the File System Access API is client-only.
  const canDetect = useSyncExternalStore(
    noSubscribe,
    supportsFolderDetect,
    () => null,
  );
  const [folder, setFolder] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canDetect) return;
    let live = true;
    rememberedFolderName().then((name) => {
      if (live) setFolder(name);
    });
    return () => {
      live = false;
    };
  }, [canDetect]);

  const finish = useCallback(
    (inputs: FileInput[]) => {
      const result = loadFiles(inputs);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLoaded(result.data);
    },
    [onLoaded],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      setBusy("parsing");
      try {
        const inputs = await readFileInputs(files);
        if (inputs.length === 0) {
          setError(
            `Drop TSM desktop Data Export files named ${ACCEPTED_FILENAME_PATTERN}, or the .zip they came in.`,
          );
          return;
        }
        finish(inputs);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [finish],
  );

  const onDetect = useCallback(
    async (choose: boolean) => {
      setError(null);
      setBusy("detecting");
      try {
        const r = await detectExport({ choose });
        if (r.kind === "cancelled") return;
        setFolder(r.folder);
        if (r.kind === "none") {
          setError(
            `No TSM Data Export found in “${r.folder}”. Export from the TSM desktop app (Game Mode “Forever”), or choose the folder it saves to.`,
          );
          return;
        }
        finish(r.files);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [finish],
  );

  return (
    <section className="flex flex-col gap-4">
      {canDetect && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-[#e0e0e0]">
              {folder ? (
                <>
                  Load the newest export from{" "}
                  <span className="text-[#5dcaa5]">{folder}</span>
                </>
              ) : (
                "Find your export on the Desktop"
              )}
            </p>
            <p className="text-xs text-[#999]">
              {folder
                ? "One click rescans the folder you chose and loads the latest TSM_<Realm>_*_<date>.csv set (or its .zip)."
                : "Opens your Desktop on Windows, macOS or Linux. Confirm the folder once; after that it's one click. Files are read in your browser only."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {folder && (
              <button
                type="button"
                onClick={() => onDetect(true)}
                disabled={busy !== null}
                className="text-xs text-[#999] underline-offset-2 hover:text-[#e0e0e0] hover:underline disabled:opacity-50"
              >
                Use a different folder…
              </button>
            )}
            <button
              type="button"
              onClick={() => onDetect(false)}
              disabled={busy !== null}
              className="rounded bg-[#5dcaa5] px-3 py-1.5 text-sm font-medium text-[#0a1814] hover:bg-[#7fdab8] disabled:opacity-50"
            >
              {busy === "detecting" ? "Looking…" : "Detect TSM export"}
            </button>
          </div>
        </div>
      )}

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
          {canDetect ? "Or drop your TSM Forever export here" : "Drop your TSM Forever export here"}
        </p>
        <p className="max-w-md text-xs text-[#999]">
          In the TSM desktop app, open Data Export and pick Game Mode
          &ldquo;Forever&rdquo; and your realm. Drop the .zip or the{" "}
          <code className={CODE}>TSM_&lt;Realm&gt;_&lt;Kind&gt;_&lt;YYYY-MM-DD&gt;.csv</code>{" "}
          files. Any subset works. Your data never leaves your browser — parsed in-page,
          stored locally in IndexedDB.
        </p>
        {canDetect === false && (
          <p className="max-w-md text-xs text-[#666]">
            One-click detection from your Desktop needs Chrome or Edge.
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,.zip,application/zip"
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

      {busy === "parsing" && (
        <p className="text-xs text-[#999]">Parsing your TSM export…</p>
      )}
    </section>
  );
}
