"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { listWeekStartsInRange, weekEndMonday, weekStartTuesday } from "@/lib/weeks";

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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function DateRangePicker({ fullStart, fullEnd, value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(value.kind === "custom");
  const [customStart, setCustomStart] = useState(
    value.kind === "custom" ? toIsoDate(value.start) : toIsoDate(fullStart),
  );
  const [customEnd, setCustomEnd] = useState(
    value.kind === "custom" ? toIsoDate(value.end) : toIsoDate(fullEnd),
  );

  // Weeks newest-first so the visually-most-recent activity sits at the
  // left edge of the scroll strip (where the pointer naturally lands).
  const weekStarts = useMemo(
    () => listWeekStartsInRange(fullStart, fullEnd).reverse(),
    [fullStart, fullEnd],
  );

  const isAll = value.kind === "all";
  const activeWeekKey =
    value.kind === "week" ? toIsoDate(value.weekStart) : null;

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
  // highlight it. We check Last 7d / Last 28d.
  const presetActive = useMemo(() => {
    if (value.kind !== "custom") return null;
    const days = Math.round(
      (value.end.getTime() - value.start.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;
    const recentEnd = new Date(fullEnd);
    recentEnd.setHours(23, 59, 59, 999);
    if (Math.abs(value.end.getTime() - recentEnd.getTime()) > 60_000) return null;
    if (days === 7) return 7;
    if (days === 28) return 28;
    return null;
  }, [value, fullEnd]);

  // ── auto-scroll to the active week ───────────────────────────────────────
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activeWeekKey) return;
    const el = stripRef.current?.querySelector(
      `[data-week="${activeWeekKey}"]`,
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeWeekKey]);

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
          active={presetActive === 28}
          onClick={() => onPreset(28)}
        >
          Last 28d
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

      <WeekStrip
        ref={stripRef}
        weekStarts={weekStarts}
        activeKey={activeWeekKey}
        onPick={(ws) => {
          setShowCustom(false);
          onChange({ kind: "week", weekStart: weekStartTuesday(ws) });
        }}
      />
    </div>
  );
}

function WeekStrip({
  ref,
  weekStarts,
  activeKey,
  onPick,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  weekStarts: Date[];
  activeKey: string | null;
  onPick: (d: Date) => void;
}) {
  // Group consecutive weeks that share a month (uses week-start month).
  const groups = useMemo(() => {
    const out: Array<{ label: string; weeks: Date[] }> = [];
    for (const w of weekStarts) {
      const label = `${MONTHS[w.getMonth()]} ${w.getFullYear() % 100}`;
      const last = out[out.length - 1];
      if (last && last.label === label) last.weeks.push(w);
      else out.push({ label, weeks: [w] });
    }
    return out;
  }, [weekStarts]);

  if (weekStarts.length === 0) return null;

  return (
    <div
      ref={ref}
      className="flex max-w-full snap-x gap-3 overflow-x-auto pb-2"
      role="tablist"
      aria-label="Trading weeks"
    >
      {groups.map((g) => (
        <div key={g.label} className="flex shrink-0 flex-col gap-1">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-[#666]">
            {g.label}
          </span>
          <div className="flex gap-1">
            {g.weeks.map((ws) => {
              const key = toIsoDate(ws);
              const we = weekEndMonday(ws);
              const active = activeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-week={key}
                  onClick={() => onPick(ws)}
                  className={`shrink-0 snap-start whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? "border-[#5dcaa5] bg-[#1f2a26] text-[#e0e0e0]"
                      : "border-[#333] bg-[#252525] text-[#999] hover:text-[#e0e0e0]"
                  }`}
                >
                  {fmtMD(ws)}–{fmtMD(we)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
