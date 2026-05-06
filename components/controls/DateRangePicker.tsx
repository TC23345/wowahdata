"use client";

import { useMemo, useState } from "react";

export type RangeSelection =
  | { kind: "all" }
  | { kind: "week"; weekStart: Date } // legacy URL bookmark; UI no longer emits this
  | { kind: "custom"; start: Date; end: Date };

type Props = {
  fullStart: Date;
  fullEnd: Date;
  value: RangeSelection;
  onChange: (next: RangeSelection) => void;
};

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function DateRangePicker({ fullStart, fullEnd, value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(value.kind === "custom");
  const [customStart, setCustomStart] = useState(
    value.kind === "custom" ? toIsoDate(value.start) : toIsoDate(fullStart),
  );
  const [customEnd, setCustomEnd] = useState(
    value.kind === "custom" ? toIsoDate(value.end) : toIsoDate(fullEnd),
  );

  const isAll = value.kind === "all";

  // ── relative presets, anchored to the dataset's most recent activity ────
  const onPreset = (days: number) => {
    const end = new Date(fullEnd);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    setShowCustom(false);
    onChange({ kind: "custom", start, end });
  };

  // Detect whether the current range matches a relative preset so we can
  // highlight it. We check Last 7d / Last 30d.
  const presetActive = useMemo(() => {
    if (value.kind !== "custom") return null;
    const days = Math.round(
      (value.end.getTime() - value.start.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;
    const recentEnd = new Date(fullEnd);
    recentEnd.setHours(23, 59, 59, 999);
    if (Math.abs(value.end.getTime() - recentEnd.getTime()) > 60_000) return null;
    if (days === 7) return 7;
    if (days === 30) return 30;
    return null;
  }, [value, fullEnd]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Preset
          active={isAll}
          onClick={() => {
            setShowCustom(false);
            onChange({ kind: "all" });
          }}
        >
          All Time
        </Preset>
        <Preset
          active={presetActive === 7}
          onClick={() => onPreset(7)}
        >
          Last 7d
        </Preset>
        <Preset
          active={presetActive === 30}
          onClick={() => onPreset(30)}
        >
          Last 30d
        </Preset>
        <Preset
          active={value.kind === "custom" && presetActive === null}
          onClick={() => setShowCustom((s) => !s)}
        >
          Custom…
        </Preset>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-2 rounded border border-[#333] bg-[#1a1a1a] p-3 text-xs text-[#999]">
          <Field label="Start">
            <input
              type="date"
              value={customStart}
              min={toIsoDate(fullStart)}
              max={toIsoDate(fullEnd)}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded border border-[#333] bg-[#252525] px-2 py-1 text-[#e0e0e0]"
            />
          </Field>
          <Field label="End">
            <input
              type="date"
              value={customEnd}
              min={toIsoDate(fullStart)}
              max={toIsoDate(fullEnd)}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded border border-[#333] bg-[#252525] px-2 py-1 text-[#e0e0e0]"
            />
          </Field>
          <button
            type="button"
            onClick={() => {
              const s = fromIsoDate(customStart);
              const e = fromIsoDate(customEnd);
              if (s && e && s <= e) {
                const end = new Date(e);
                end.setHours(23, 59, 59, 999);
                onChange({ kind: "custom", start: s, end });
              }
            }}
            className="rounded bg-[#5dcaa5] px-3 py-1 font-medium text-[#0a1814] hover:bg-[#7fdab8]"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function Preset({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 transition-colors ${
        active
          ? "border-[#5dcaa5] bg-[#1f2a26] text-[#e0e0e0]"
          : "border-[#333] bg-[#252525] text-[#999] hover:border-[#555] hover:text-[#e0e0e0]"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[#666]">
        {label}
      </span>
      {children}
    </label>
  );
}
