"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ItemCombobox } from "@/components/ah/ItemCombobox";
import type { ItemSummary } from "@/lib/items";
import { EDITION_LABEL, ACTIVE_EDITION } from "@/lib/edition";
import { WORKSPACES, type WorkspaceDefinition, type WorkspaceId } from "@/lib/workspaces";
import { Popover } from "./Popover";
import { Segmented } from "./Segmented";

// The three persistent bars (docs/forever/04-layout-system.md §3). Each has a
// fixed height per arrangement and sheds content by arrangement — never by
// wrapping — so nothing the user picks can change their size.

function Chevron() {
  return (
    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="flex-none fill-none stroke-[#999] stroke-[1.5]">
      <path d="M2 4l3 3 3-3" />
    </svg>
  );
}

const BUTTON = "flex h-[30px] flex-none items-center justify-between gap-2 rounded-md border border-[#333] bg-[#252525] px-2.5 text-xs text-[#e0e0e0] hover:border-[#555] disabled:opacity-50";

// ── A: scope bar ─────────────────────────────────────────────────────────────

type ScopeProps = {
  realms: string[];
  activeRealm: string | null;
  onSwitchRealm: (r: string) => void;
  tz: "local" | "utc";
  onTz: (tz: "local" | "utc") => void;
  status: string;
  onManage: () => void;
  ready: boolean;
};

export function ScopeBar({ realms, activeRealm, onSwitchRealm, tz, onTz, status, onManage, ready }: ScopeProps) {
  const marketRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const zone = <Segmented label="Display time zone" value={tz} onChange={onTz} options={[{ value: "local", label: "Local" }, { value: "utc", label: "UTC" }]} />;

  return (
    <div className="bar bar-a" data-region="scope-bar">
      <span className="not-narrow w-[120px] flex-none truncate text-base font-bold text-[#e0e0e0]">wowahdata</span>
      <span className="only-narrow w-7 flex-none text-base font-bold text-[#e0e0e0]" aria-label="wowahdata">
        w
      </span>
      <span className="only-wide">
        <Segmented
          label="Edition"
          value={ACTIVE_EDITION}
          onChange={() => {}}
          options={[
            { value: "classic-anniversary", label: EDITION_LABEL["classic-anniversary"] },
            { value: "forever", label: EDITION_LABEL.forever, disabled: true },
          ]}
        />
      </span>
      <button
        ref={marketRef}
        type="button"
        className={`${BUTTON} w-[240px] min-w-[160px] flex-shrink`}
        disabled={!ready}
        onClick={() => setMarketOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={marketOpen}
      >
        <span className="truncate">{activeRealm ? `${activeRealm} · All houses` : "No data loaded"}</span>
        <Chevron />
      </button>
      <Popover open={marketOpen} onClose={() => setMarketOpen(false)} anchorRef={marketRef} width={280} label="Market">
        <div className="py-1 text-[13px]">
          <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-[#999]">Datasets</p>
          {realms.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onSwitchRealm(r);
                setMarketOpen(false);
              }}
              className={`flex h-8 w-full items-center px-3 text-left hover:bg-[#252525] ${r === activeRealm ? "text-[#5dcaa5]" : "text-[#e0e0e0]"}`}
            >
              {r}
            </button>
          ))}
          <p className="border-t border-[#333] px-3 py-2 text-xs leading-5 text-[#999]">
            A Classic realm has one auction house. Forever datasets will list each ruleset with its Alliance, Horde and Blackwater houses here.
          </p>
        </div>
      </Popover>
      <span className="only-wide">{zone}</span>
      <div className="min-w-0 flex-1" />
      <span className="only-wide h-[30px] w-[200px] flex-none items-center gap-2 truncate rounded-md border border-[#3a4d44] bg-[#1f2a26] px-2.5 text-xs leading-[28px] text-[#5dcaa5]" title={status}>
        {status}
      </span>
      <button ref={moreRef} type="button" className={`${BUTTON} w-9 justify-center`} aria-label="More" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
        ⋯
      </button>
      <Popover open={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreRef} width={260} align="end" label="More">
        <div className="flex flex-col gap-3 p-3 text-xs text-[#999]">
          <div className="below-wide flex-col gap-1.5">
            <span className="uppercase tracking-wide">Time zone</span>
            {zone}
          </div>
          <p className="below-wide text-[#5dcaa5]">{status}</p>
          <button
            type="button"
            className={`${BUTTON} w-full justify-center`}
            onClick={() => {
              setMoreOpen(false);
              onManage();
            }}
          >
            Manage data…
          </button>
        </div>
      </Popover>
    </div>
  );
}

// ── B: context bar ───────────────────────────────────────────────────────────

export type RangePreset = "week" | "7" | "30" | "90" | "all" | "custom";

type ContextProps = {
  workspace: WorkspaceDefinition;
  items: ItemSummary[];
  pinned: string[];
  item: string;
  onItem: (name: string) => void;
  preset: RangePreset;
  onPreset: (p: Exclude<RangePreset, "custom">) => void;
  onCustom: (start: string, end: string) => void;
  rangeLabel: string;
  bounds: { min: string; max: string };
  current: { start: string; end: string };
  ready: boolean;
};

const PRESETS: { value: Exclude<RangePreset, "custom">; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
];

const QUICK_SLOT = 132;
const QUICK_GAP = 8;

export function ContextBar(props: ContextProps) {
  const { workspace, items, pinned, item, onItem, preset, onPreset, ready } = props;
  const subjectDisabled = !ready || workspace.subject !== "item";
  const placeholder = workspace.subject === "pipeline" ? "All conversions" : workspace.subject === "none" ? "All items" : "";

  const combobox = (
    <ItemCombobox items={items} pinned={pinned} value={item} onChange={onItem} disabled={subjectDisabled} placeholder={ready ? placeholder : "No data loaded"} />
  );
  const range = (
    <>
      <Segmented label="Range" value={preset === "custom" ? null : preset} onChange={onPreset} options={PRESETS} disabled={!ready} />
      <CustomRange {...props} />
    </>
  );

  return (
    <div className="bar bar-b" data-region="context-bar">
      {/* wide: one line */}
      <div className="only-wide flex min-w-0 flex-1 items-center gap-2">
        {combobox}
        <QuickRow pinned={pinned} item={item} onItem={onItem} disabled={subjectDisabled} />
        <span className="h-6 w-px flex-none bg-[#333]" />
        {range}
        <span className="hide-below-1272 w-[184px] flex-none truncate text-right text-xs text-[#999]">{props.rangeLabel}</span>
      </div>
      {/* medium: two fixed lines; narrow: combobox + one range button */}
      <div className="below-wide bar-b-line1 min-w-0">
        <div className="min-w-0 flex-1 [&>div]:w-full">{combobox}</div>
        <span className="only-narrow">
          <NarrowRange {...props} />
        </span>
      </div>
      <div className="bar-b-line2 not-narrow below-wide">{range}</div>
    </div>
  );
}

function QuickRow({ pinned, item, onItem, disabled }: { pinned: string[]; item: string; onItem: (n: string) => void; disabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCount(Math.max(0, Math.min(5, Math.floor((entry.contentRect.width + QUICK_GAP) / (QUICK_SLOT + QUICK_GAP)))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex min-w-0 flex-1 gap-2 overflow-hidden" aria-label="Pinned items">
      {pinned.slice(0, count).map((name) => {
        const on = name === item && !disabled;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            onClick={() => onItem(name)}
            title={name}
            className={`h-8 flex-none truncate rounded-md border px-2.5 text-xs disabled:opacity-45 ${
              on ? "border-[#5dcaa5] bg-[#1f2a26] text-[#5dcaa5]" : "border-[#333] bg-[#252525] text-[#e0e0e0] hover:border-[#555]"
            }`}
            style={{ width: QUICK_SLOT }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

function DateFields({ bounds, current, onApply }: { bounds: ContextProps["bounds"]; current: ContextProps["current"]; onApply: (s: string, e: string) => void }) {
  const [start, setStart] = useState(current.start);
  const [end, setEnd] = useState(current.end);
  const field = "h-8 rounded border border-[#333] bg-[#252525] px-2 text-[#e0e0e0]";
  return (
    <form
      className="flex flex-col gap-3 p-3 text-xs text-[#999]"
      onSubmit={(e) => {
        e.preventDefault();
        if (start && end && start <= end) onApply(start, end);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="uppercase tracking-wide">Start</span>
        <input type="date" value={start} min={bounds.min} max={bounds.max} onChange={(e) => setStart(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="uppercase tracking-wide">End</span>
        <input type="date" value={end} min={bounds.min} max={bounds.max} onChange={(e) => setEnd(e.target.value)} className={field} />
      </label>
      <button type="submit" className="h-8 rounded bg-[#5dcaa5] font-medium text-[#0a1814] hover:bg-[#7fdab8]">
        Apply
      </button>
    </form>
  );
}

function CustomRange({ preset, onCustom, bounds, current, ready, rangeLabel }: ContextProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={!ready}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${BUTTON} h-8 w-[92px] ${preset === "custom" ? "border-[#5dcaa5] text-[#5dcaa5]" : ""}`}
      >
        Custom <Chevron />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} width={240} align="end" label="Custom range">
        <p className="px-3 pt-3 text-xs text-[#e0e0e0]">{rangeLabel}</p>
        <DateFields
          bounds={bounds}
          current={current}
          onApply={(s, e) => {
            onCustom(s, e);
            setOpen(false);
          }}
        />
      </Popover>
    </>
  );
}

function NarrowRange(props: ContextProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} type="button" disabled={!props.ready} onClick={() => setOpen((o) => !o)} className={`${BUTTON} h-8 w-[112px]`} aria-haspopup="dialog" aria-expanded={open}>
        Range <Chevron />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} width={260} align="end" label="Range">
        <div className="flex flex-col gap-1 p-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                props.onPreset(p.value);
                setOpen(false);
              }}
              className={`h-8 rounded px-2 text-left text-[13px] hover:bg-[#252525] ${props.preset === p.value ? "text-[#5dcaa5]" : "text-[#e0e0e0]"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <DateFields
          bounds={props.bounds}
          current={props.current}
          onApply={(s, e) => {
            props.onCustom(s, e);
            setOpen(false);
          }}
        />
      </Popover>
    </>
  );
}

// ── C: workspace nav ─────────────────────────────────────────────────────────

export function WorkspaceNav({ active, onChange }: { active: WorkspaceId; onChange: (id: WorkspaceId) => void }) {
  const current = WORKSPACES.find((w) => w.id === active)!;
  return (
    <nav className="bar bar-c" data-region="workspace-nav" aria-label="Workspaces">
      {WORKSPACES.map((w) => {
        const on = w.id === active;
        return (
          <button
            key={w.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(w.id)}
            className={`flex-none rounded-t-md border-b-2 px-4 text-[13px] font-semibold ${
              on ? "border-[#5dcaa5] bg-[#252525] text-[#e0e0e0]" : "border-transparent text-[#999] hover:text-[#e0e0e0]"
            }`}
          >
            {w.label}
          </button>
        );
      })}
      <div className="min-w-0 flex-1" />
      <span className="not-narrow self-center truncate text-xs text-[#999]">{current.question}</span>
    </nav>
  );
}

export function PageFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="flex h-8 items-center justify-between gap-4 border-t border-[#333] text-[11px] text-[#999]" data-region="footer">
      {children}
    </footer>
  );
}
