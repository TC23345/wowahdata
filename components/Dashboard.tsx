"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoadedData } from "@/lib/csv";
import {
  aggregateItems,
  filterByDisplayName,
} from "@/lib/items";
import { weekStartTuesday, weekEndMonday } from "@/lib/weeks";
import { CURATED_ITEMS, DEFAULT_ITEM } from "@/lib/curated";
import { filterForItem, statsForItem } from "@/lib/transform";
import { SaleHeatmap } from "@/components/heatmap/SaleHeatmap";
import { ItemChips } from "@/components/controls/ItemChips";
import {
  DateRangePicker,
  type RangeSelection,
} from "@/components/controls/DateRangePicker";
import { UploadZone } from "@/components/UploadZone";
import { StatCards } from "@/components/StatCards";
import { ScatterChart } from "@/components/charts/ScatterChart";
import { DailyPnLChart } from "@/components/charts/DailyPnLChart";
import { PriceDistributionChart } from "@/components/charts/PriceDistributionChart";
import { CashFlowPanel } from "@/components/panels/CashFlowPanel";
import { SellThroughPanel } from "@/components/panels/SellThroughPanel";
import { useDashboardParams } from "@/hooks/useDashboardParams";
import {
  clearAllData,
  getActiveRealm,
  listRealms,
  loadRealmData,
  saveRealmData,
  setActiveRealm,
} from "@/lib/storage";

type LoadState =
  | { kind: "boot" }
  | { kind: "empty" }
  | { kind: "ready"; data: LoadedData; realms: string[] };

type Tab = "heatmap" | "scatter" | "pnl" | "histogram" | "cashflow" | "sellthrough";
const TAB_LABELS: Record<Tab, string> = {
  heatmap: "Heatmap",
  scatter: "Scatter",
  pnl: "P&L",
  histogram: "Histogram",
  cashflow: "Cash flow",
  sellthrough: "Sell-through",
};
const TABS: Tab[] = ["heatmap", "scatter", "pnl", "histogram", "cashflow", "sellthrough"];

export function Dashboard() {
  const [state, setState] = useState<LoadState>({ kind: "boot" });
  const { params, setParams } = useDashboardParams();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const realms = await listRealms();
      if (realms.length === 0) {
        if (!cancelled) setState({ kind: "empty" });
        return;
      }
      const active = (await getActiveRealm()) ?? realms[0];
      const data = await loadRealmData(active);
      if (!cancelled) {
        if (data) setState({ kind: "ready", data, realms });
        else setState({ kind: "empty" });
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
  }, []);

  const onSwitchRealm = useCallback(async (realm: string) => {
    await setActiveRealm(realm);
    const data = await loadRealmData(realm);
    if (data) {
      setState((prev) =>
        prev.kind === "ready" ? { ...prev, data } : prev,
      );
    }
  }, []);

  const onClear = useCallback(async () => {
    if (!confirm("Clear all loaded TSM data from this browser?")) return;
    await clearAllData();
    setState({ kind: "empty" });
    setParams({ item: null, range: null, start: null, end: null, tab: null });
  }, [setParams]);

  if (state.kind === "boot") {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (state.kind === "empty") {
    return <UploadZone onLoaded={onLoaded} />;
  }

  return (
    <ReadyView
      data={state.data}
      realms={state.realms}
      onSwitchRealm={onSwitchRealm}
      onLoaded={onLoaded}
      onClear={onClear}
      params={params}
      setParams={setParams}
    />
  );
}

function ReadyView({
  data,
  realms,
  onSwitchRealm,
  onLoaded,
  onClear,
  params,
  setParams,
}: {
  data: LoadedData;
  realms: string[];
  onSwitchRealm: (r: string) => void;
  onLoaded: (d: LoadedData) => void;
  onClear: () => void;
  params: ReturnType<typeof useDashboardParams>["params"];
  setParams: ReturnType<typeof useDashboardParams>["setParams"];
}) {
  const [showUpload, setShowUpload] = useState(false);

  const items = useMemo(() => aggregateItems(data), [data]);

  const { fullStart, fullEnd } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    const consider = (t: number) => {
      if (t < min) min = t;
      if (t > max) max = t;
    };
    for (const r of data.sales) consider(r.time);
    for (const r of data.purchases) consider(r.time);
    if (!Number.isFinite(min)) {
      const now = new Date();
      return { fullStart: now, fullEnd: now };
    }
    return {
      fullStart: new Date(min * 1000),
      fullEnd: new Date(max * 1000),
    };
  }, [data]);

  const item = isKnownItem(items, params.item) ? params.item! : DEFAULT_ITEM;
  const range = parseRange(params);
  const tab: Tab = isTab(params.tab) ? (params.tab as Tab) : "heatmap";

  const filtered = useMemo(() => {
    const dateRange =
      range.kind === "all"
        ? undefined
        : range.kind === "week"
          ? {
              start: range.weekStart,
              end: weekEndMonday(range.weekStart),
            }
          : { start: range.start, end: range.end };
    return filterForItem(data, item, dateRange);
  }, [data, item, range]);

  const stats = useMemo(() => statsForItem(filtered), [filtered]);
  const itemSales = useMemo(() => filterByDisplayName(filtered.sales, item), [filtered.sales, item]);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Item
            </span>
            <ManageDataMenu
              realms={realms}
              activeRealm={data.realm}
              onSwitchRealm={onSwitchRealm}
              onUploadMore={() => setShowUpload(true)}
              onClear={onClear}
            />
          </div>
          <ItemChips
            items={items}
            value={item}
            onChange={(next) =>
              setParams({ item: next === DEFAULT_ITEM ? null : next })
            }
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Range
          </span>
          <DateRangePicker
            fullStart={fullStart}
            fullEnd={fullEnd}
            value={range}
            onChange={(next) => {
              if (next.kind === "all") {
                setParams({ range: null, start: null, end: null });
              } else if (next.kind === "week") {
                setParams({
                  range: `week:${toIsoDate(next.weekStart)}`,
                  start: null,
                  end: null,
                });
              } else {
                setParams({
                  range: "custom",
                  start: toIsoDate(next.start),
                  end: toIsoDate(next.end),
                });
              }
            }}
          />
        </div>
      </section>

      <StatCards stats={stats} />

      <div
        role="tablist"
        className="flex gap-1 border-b border-border text-xs"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            onClick={() => setParams({ tab: t === "heatmap" ? null : t })}
            className={`rounded-t px-3 py-1.5 transition-colors ${
              t === tab
                ? "border-b-2 border-accent bg-surface text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "heatmap" && <SaleHeatmap rows={itemSales} itemName={item} />}
      {tab === "scatter" && (
        <ScatterChart buys={filtered.purchases} sells={filtered.sales} itemName={item} />
      )}
      {tab === "pnl" && (
        <DailyPnLChart
          buys={filtered.purchases}
          sells={filtered.sales}
          expired={filtered.expired}
          canceled={filtered.canceled}
          itemName={item}
        />
      )}
      {tab === "histogram" && (
        <PriceDistributionChart
          buys={filtered.purchases}
          sells={filtered.sales}
          itemName={item}
        />
      )}
      {tab === "cashflow" && (
        <CashFlowPanel income={filtered.income} expenses={filtered.expenses} />
      )}
      {tab === "sellthrough" && (
        <SellThroughPanel data={data} activeItem={item} />
      )}

      {showUpload && (
        <UploadZone
          onLoaded={(d) => {
            onLoaded(d);
            setShowUpload(false);
          }}
        />
      )}

      <footer className="mt-4 border-t border-divider pt-4">
        <DataMetaFooter
          data={data}
          realms={realms}
          onSwitchRealm={onSwitchRealm}
        />
      </footer>
    </div>
  );
}

function DataMetaFooter({
  data,
  realms,
  onSwitchRealm,
}: {
  data: LoadedData;
  realms: string[];
  onSwitchRealm: (r: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
      <span className="flex items-center gap-1.5">
        <span className="text-text-muted">Realm</span>
        {realms.length > 1 ? (
          <select
            value={data.realm}
            onChange={(e) => onSwitchRealm(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-text-primary"
          >
            {realms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium text-text-primary">{data.realm}</span>
        )}
      </span>
      <span className="hidden text-border-strong sm:inline">·</span>
      <span>
        <span className="text-text-primary tabular-nums">
          {data.sales.length.toLocaleString()}
        </span>{" "}
        sales
        <span className="px-1 text-border-strong">·</span>
        <span className="text-text-primary tabular-nums">
          {data.purchases.length.toLocaleString()}
        </span>{" "}
        buys
      </span>
      <span className="hidden text-border-strong sm:inline">·</span>
      <span className="text-text-muted">
        loaded {new Date(data.loadedAt).toLocaleString()}
      </span>
    </div>
  );
}

function ManageDataMenu({
  realms,
  activeRealm,
  onSwitchRealm,
  onUploadMore,
  onClear,
}: {
  realms: string[];
  activeRealm: string;
  onSwitchRealm: (r: string) => void;
  onUploadMore: () => void;
  onClear: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 text-xs text-text-primary hover:border-border-strong"
      >
        Manage data
        <span className="text-text-muted">⋯</span>
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-border bg-background shadow-xl"
        >
          {realms.length > 1 && (
            <div className="border-b border-border px-3 py-2 text-[10px] text-text-muted">
              <p className="mb-1 uppercase tracking-wide">Active realm</p>
              <select
                value={activeRealm}
                onChange={(e) => {
                  onSwitchRealm(e.target.value);
                  setMenuOpen(false);
                }}
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary"
              >
                {realms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onUploadMore();
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-surface"
          >
            Upload more files…
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onClear();
            }}
            className="block w-full border-t border-border px-3 py-2 text-left text-xs text-loss hover:bg-danger-soft"
          >
            Clear all data…
          </button>
        </div>
      )}
    </div>
  );
}

function isKnownItem(
  items: ReturnType<typeof aggregateItems>,
  name: string | null,
): boolean {
  if (!name) return false;
  if ((CURATED_ITEMS as readonly string[]).includes(name)) return true;
  return items.some((i) => i.name === name);
}

function isTab(v: string | null): boolean {
  return TABS.includes(v as Tab);
}

function parseRange(
  params: ReturnType<typeof useDashboardParams>["params"],
): RangeSelection {
  if (params.range?.startsWith("week:")) {
    const iso = params.range.slice("week:".length);
    const d = new Date(`${iso}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return { kind: "week", weekStart: weekStartTuesday(d) };
    }
  }
  if (params.range === "custom" && params.start && params.end) {
    const s = new Date(`${params.start}T00:00:00`);
    const e = new Date(`${params.end}T23:59:59.999`);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && s <= e) {
      return { kind: "custom", start: s, end: e };
    }
  }
  return { kind: "all" };
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
