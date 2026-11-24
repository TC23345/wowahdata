"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { LoadedData } from "@/lib/csv";
import { aggregateItems, type ItemSummary } from "@/lib/items";
import { weekEndMonday, weekStartTuesday } from "@/lib/weeks";
import { CURATED_ITEMS, DEFAULT_ITEM } from "@/lib/curated";
import { workspaceById, workspaceForLegacyTab, type WorkspaceId } from "@/lib/workspaces";
import type { DateRange } from "@/lib/insights";
import { useDashboardParams, type DashboardParams } from "@/hooks/useDashboardParams";
import { clearAllData, getActiveRealm, listRealms, loadRealmData, saveRealmData, setActiveRealm } from "@/lib/storage";
import { UploadZone } from "@/components/UploadZone";
import { buildBlockContext, deriveDataset } from "@/components/blocks/context";
import { ContextBar, PageFooter, ScopeBar, WorkspaceNav, type RangePreset } from "@/components/shell/Bars";
import { Workspace } from "@/components/shell/Workspace";

type LoadState = { kind: "boot" } | { kind: "empty" } | { kind: "ready"; data: LoadedData; realms: string[] };

const DAY_MS = 86_400_000;

export function Dashboard() {
  const [state, setState] = useState<LoadState>({ kind: "boot" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { params, setParams } = useDashboardParams();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const realms = await listRealms();
      const active = realms.length ? (await getActiveRealm()) ?? realms[0] : null;
      const data = active ? await loadRealmData(active) : null;
      if (cancelled) return;
      if (data) setState({ kind: "ready", data, realms });
      else {
        setState({ kind: "empty" });
        setDialogOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onLoaded = useCallback(async (data: LoadedData) => {
    await saveRealmData(data);
    const realms = await listRealms();
    setState({ kind: "ready", data, realms });
    setDialogOpen(false);
  }, []);

  const onSwitchRealm = useCallback(async (realm: string) => {
    await setActiveRealm(realm);
    const data = await loadRealmData(realm);
    if (data) setState((prev) => (prev.kind === "ready" ? { ...prev, data } : prev));
  }, []);

  const onClear = useCallback(async () => {
    if (!confirm("Clear all loaded TSM data from this browser?")) return;
    await clearAllData();
    setState({ kind: "empty" });
    setParams({ item: null, range: null, start: null, end: null, tab: null });
  }, [setParams]);

  return (
    <Frame
      state={state}
      params={params}
      setParams={setParams}
      onSwitchRealm={onSwitchRealm}
      onManage={() => setDialogOpen(true)}
      dialog={
        <DataDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLoaded={onLoaded}
          onClear={state.kind === "ready" ? onClear : null}
        />
      }
    />
  );
}

/** The Suspense fallback is the same shell and grid, booting. */
export function DashboardFallback() {
  return <Frame state={{ kind: "boot" }} params={EMPTY_PARAMS} setParams={() => {}} onSwitchRealm={() => {}} onManage={() => {}} dialog={null} />;
}

const EMPTY_PARAMS: DashboardParams = { item: null, range: null, start: null, end: null, tab: null, ws: null, tz: null };

function Frame({
  state,
  params,
  setParams,
  onSwitchRealm,
  onManage,
  dialog,
}: {
  state: LoadState;
  params: DashboardParams;
  setParams: (p: Partial<DashboardParams>) => void;
  onSwitchRealm: (r: string) => void;
  onManage: () => void;
  dialog: React.ReactNode;
}) {
  const data = state.kind === "ready" ? state.data : null;
  const workspace = workspaceById(params.ws ?? workspaceForLegacyTab(params.tab));
  const tz = params.tz === "utc" ? "utc" : "local";

  const items = useMemo<ItemSummary[]>(() => (data ? aggregateItems(data) : []), [data]);
  const derived = useMemo(() => (data ? deriveDataset(data) : null), [data]);
  const span = useMemo(() => (data ? dataSpan(data) : null), [data]);
  const pinned = useMemo(() => pinnedItems(items), [items]);

  const item = isKnownItem(items, params.item) ? params.item! : (pinned[0] ?? DEFAULT_ITEM);
  const { range, preset } = resolveRange(params, span);

  // Controls respond immediately; blocks recompute against deferred inputs and
  // show their previous result, dimmed, until the new one is ready.
  const dItem = useDeferredValue(item);
  const dStart = useDeferredValue(range.start.getTime());
  const dEnd = useDeferredValue(range.end.getTime());
  const dTz = useDeferredValue(tz);
  const dWs = useDeferredValue(workspace.id);
  const stale = dItem !== item || dStart !== range.start.getTime() || dEnd !== range.end.getTime() || dTz !== tz || dWs !== workspace.id;

  const selectItem = useCallback(
    (name: string) => setParams({ item: name }),
    [setParams],
  );

  const ctx = useMemo(() => {
    if (!data || !derived) return null;
    return buildBlockContext({
      data,
      derived,
      workspace: workspaceById(dWs),
      item: dItem,
      range: { start: new Date(dStart), end: new Date(dEnd) },
      tz: dTz,
      selectItem,
    });
  }, [data, derived, dWs, dItem, dStart, dEnd, dTz, selectItem]);

  const mode = state.kind === "ready" ? "ready" : state.kind;
  const rowCount = data
    ? data.purchases.length + data.sales.length + data.expired.length + data.canceled.length + data.income.length + data.expenses.length
    : 0;
  const status = state.kind === "boot" ? "Loading…" : data ? `${data.realm} · ${rowCount.toLocaleString("en-US")} rows` : "No data loaded";

  const onPreset = (p: Exclude<RangePreset, "custom">) => {
    if (!span) return;
    if (p === "all") return setParams({ range: null, start: null, end: null });
    if (p === "week") return setParams({ range: `week:${isoDate(weekStartTuesday(span.end))}`, start: null, end: null });
    const end = endOfDay(span.end);
    const start = startOfDay(new Date(end.getTime() - (Number(p) - 1) * DAY_MS));
    setParams({ range: "custom", start: isoDate(start), end: isoDate(end) });
  };

  return (
    <main className="shell" aria-busy={state.kind === "boot"}>
      <ScopeBar
        realms={state.kind === "ready" ? state.realms : []}
        activeRealm={data?.realm ?? null}
        onSwitchRealm={onSwitchRealm}
        tz={tz}
        onTz={(next) => setParams({ tz: next === "local" ? null : next })}
        status={status}
        onManage={onManage}
        ready={state.kind === "ready"}
      />
      <div className="sticky-bars">
        <ContextBar
          workspace={workspace}
          items={items}
          pinned={pinned}
          item={item}
          onItem={(name) => setParams({ item: name })}
          preset={preset}
          onPreset={onPreset}
          onCustom={(start, end) => setParams({ range: "custom", start, end })}
          rangeLabel={rangeLabel(range)}
          bounds={{ min: span ? isoDate(span.start) : "", max: span ? isoDate(span.end) : "" }}
          current={{ start: isoDate(range.start), end: isoDate(range.end) }}
          ready={state.kind === "ready"}
        />
        <WorkspaceNav
          active={workspace.id}
          onChange={(id: WorkspaceId) => setParams({ ws: id === "item" ? null : id, tab: null })}
        />
      </div>
      <div className="ws-canvas" data-region="canvas">
        <Workspace workspace={workspace} ctx={mode === "ready" ? ctx : null} mode={mode} stale={stale} />
      </div>
      <PageFooter>
        <span className="truncate">Auction rows only · prices per unit, as recorded (already net of the AH cut) · roles computed over all time</span>
        <span className="flex-none text-[#5dcaa5]">Your data never leaves your browser</span>
      </PageFooter>
      {dialog}
    </main>
  );
}

function DataDialog({
  open,
  onClose,
  onLoaded,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  onLoaded: (d: LoadedData) => void;
  onClear: (() => void) | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog ref={ref} className="data-dialog" onClose={onClose} aria-label="Manage data">
      <div className="flex items-center justify-between border-b border-[#333] px-5 py-3">
        <h2 className="text-sm font-semibold">Manage data</h2>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-[#999] hover:text-[#e0e0e0]" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-[#999]">
          Drop your TradeSkillMaster Accounting CSVs, or load the sample. Parsing happens in this browser; nothing is uploaded.
        </p>
        {open && <UploadZone onLoaded={onLoaded} />}
        {onClear && (
          <button type="button" onClick={onClear} className="self-start rounded border border-[#5a2526] px-3 py-1.5 text-xs text-[#f07b7a] hover:bg-[#2a1010]">
            Clear all data…
          </button>
        )}
      </div>
    </dialog>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function dataSpan(data: LoadedData): { start: Date; end: Date } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const rows of [data.sales, data.purchases, data.expired, data.canceled]) {
    for (const r of rows) {
      if (r.time < min) min = r.time;
      if (r.time > max) max = r.time;
    }
  }
  return Number.isFinite(min) ? { start: new Date(min * 1000), end: new Date(max * 1000) } : null;
}

function pinnedItems(items: ItemSummary[]): string[] {
  const byName = new Map(items.map((i) => [i.name, i]));
  return (CURATED_ITEMS as readonly string[])
    .map((n) => byName.get(n))
    .filter((i): i is ItemSummary => Boolean(i && i.txnCount > 0))
    .sort((a, b) => b.txnCount - a.txnCount)
    .slice(0, 5)
    .map((i) => i.name);
}

function isKnownItem(items: ItemSummary[], name: string | null): boolean {
  return Boolean(name && items.some((i) => i.name === name));
}

function startOfDay(d: Date): Date {
  const o = new Date(d);
  o.setHours(0, 0, 0, 0);
  return o;
}

function endOfDay(d: Date): Date {
  const o = new Date(d);
  o.setHours(23, 59, 59, 999);
  return o;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveRange(params: DashboardParams, span: { start: Date; end: Date } | null): { range: DateRange; preset: RangePreset } {
  const now = new Date();
  const all = span ? { start: startOfDay(span.start), end: endOfDay(span.end) } : { start: startOfDay(now), end: endOfDay(now) };
  if (params.range?.startsWith("week:")) {
    const d = parseIso(params.range.slice(5));
    if (d) {
      const ws = weekStartTuesday(d);
      const isCurrent = span && ws.getTime() === weekStartTuesday(span.end).getTime();
      return { range: { start: ws, end: weekEndMonday(ws) }, preset: isCurrent ? "week" : "custom" };
    }
  }
  if (params.range === "custom") {
    const s = parseIso(params.start);
    const e = parseIso(params.end);
    if (s && e && s <= e) {
      const range = { start: s, end: endOfDay(e) };
      const days = Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS);
      const anchored = span && isoDate(e) === isoDate(span.end);
      const preset: RangePreset = anchored && (days === 7 || days === 30 || days === 90) ? (String(days) as RangePreset) : "custom";
      return { range, preset };
    }
  }
  return { range: all, preset: "all" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Always "21 Jan 26 – 6 May 26": two-digit years, so cross-year ranges fit the same width. */
function rangeLabel(r: DateRange): string {
  const f = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear() % 100).padStart(2, "0")}`;
  return `${f(r.start)} – ${f(r.end)}`;
}
