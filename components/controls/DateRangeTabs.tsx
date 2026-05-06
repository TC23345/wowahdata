"use client";

import { useMemo, useState } from "react";
import { listWeekStartsInRange, weekEndMonday } from "@/lib/weeks";

export type RangeSelection =
  | { kind: "all" }
  | { kind: "week"; weekStart: Date }
  | { kind: "custom"; start: Date; end: Date };

type Props = {
  fullStart: Date;
  fullEnd: Date;
  value: RangeSelection;
  onChange: (next: RangeSelection) => void;
};

function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function DateRangeTabs({ fullStart, fullEnd, value, onChange }: Props) {
  const weekStarts = useMemo(
    () => listWeekStartsInRange(fullStart, fullEnd).reverse(),
    [fullStart, fullEnd],
  );
  const [showCustom, setShowCustom] = useState(value.kind === "custom");
  const [customStart, setCustomStart] = useState(
    value.kind === "custom" ? toIsoDate(value.start) : toIsoDate(fullStart),
  );
  const [customEnd, setCustomEnd] = useState(
    value.kind === "custom" ? toIsoDate(value.end) : toIsoDate(fullEnd),
  );

  const isAll = value.kind === "all";
  const activeWeekKey =
    value.kind === "week" ? toIsoDate(value.weekStart) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <Tab active={isAll} onClick={() => { setShowCustom(false); onChange({ kind: "all" }); }}>
          All Time
        </Tab>
        {weekStarts.map((ws) => {
          const key = toIsoDate(ws);
          const we = weekEndMonday(ws);
          return (
            <Tab
              key={key}
              active={activeWeekKey === key}
              onClick={() => {
                setShowCustom(false);
                onChange({ kind: "week", weekStart: ws });
              }}
            >
              {fmtMD(ws)}–{fmtMD(we)}
            </Tab>
          );
        })}
        <Tab
          active={value.kind === "custom"}
          onClick={() => setShowCustom((s) => !s)}
        >
          Custom…
        </Tab>
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
            className="rounded bg-[#333] px-3 py-1 text-[#e0e0e0] hover:bg-[#444]"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function Tab({
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
      className={`rounded-full border px-2.5 py-1 transition-colors ${
        active
          ? "border-[#555] bg-[#333] text-[#e0e0e0]"
          : "border-[#333] bg-[#252525] text-[#999] hover:text-[#e0e0e0]"
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
