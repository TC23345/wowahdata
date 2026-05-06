"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LoadedData } from "@/lib/csv";
import {
  aggregateItems,
  filterByDisplayName,
} from "@/lib/items";
import { weekStartTuesday, weekEndMonday } from "@/lib/weeks";
import { CURATED_ITEMS, DEFAULT_ITEM } from "@/lib/curated";
import { filterForItem, statsForItem } from "@/lib/transform";
import { SaleHeatmap } from "@/components/heatmap/SaleHeatmap";
import { ItemSelector } from "@/components/controls/ItemSelector";
import {
  DateRangeTabs,
  type RangeSelection,
} from "@/components/controls/DateRangeTabs";
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

// Tabs that aggregate across the whole dataset (item filter doesn't apply).
const ACROSS_ALL = new Set<Tab>(["cashflow", "sellthrough"]);

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
    return <p className="text-sm text-[#666]">Loading…</p>;
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-[#999]">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Realm:{" "}
            {realms.length > 1 ? (
              <select
                value={data.realm}
                onChange={(e) => onSwitchRealm(e.target.value)}
                className="rounded border border-[#333] bg-[#252525] px-2 py-1 text-[#e0e0e0]"
              >
                {realms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[#e0e0e0]">{data.realm}</span>
            )}
          </span>
          <span>
            Loaded {new Date(data.loadedAt).toLocaleString()} ·{" "}
            {data.sales.length.toLocaleString()} sales · {data.purchases.length.toLocaleString()} buys
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowUpload((s) => !s)}
            className="rounded border border-[#333] bg-[#252525] px-2 py-1 text-[#e0e0e0] hover:border-[#555]"
          >
            {showUpload ? "Close" : "Upload more"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-[#5a2526] bg-[#2a1010] px-2 py-1 text-[#e24b4a] hover:bg-[#3a1818]"
          >
            Clear data
          </button>
        </div>
      </div>

      {showUpload && (
        <UploadZone onLoaded={(d) => { onLoaded(d); setShowUpload(false); }} />
      )}

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Item">
          <ItemSelector
            items={items}
            value={item}
            onChange={(next) =>
              setParams({ item: next === DEFAULT_ITEM ? null : next })
            }
          />
        </Field>
        <Field label="Range">
          <DateRangeTabs
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
        </Field>
      </div>

      <StatCards stats={stats} />

      <div
        role="tablist"
        className="flex gap-1 border-b border-[#333] text-xs"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            onClick={() => setParams({ tab: t === "heatmap" ? null : t })}
            className={`rounded-t px-3 py-1.5 transition-colors ${
              t === tab
                ? "border-b-2 border-[#5dcaa5] bg-[#252525] text-[#e0e0e0]"
                : "text-[#999] hover:text-[#e0e0e0]"
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[#666]">
        {label}
      </span>
      {children}
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
  return d.toISOString().slice(0, 10);
}
