"use client";

import { useMemo } from "react";
import type { PurchaseSaleRow } from "@/lib/csv";
import type { ItemSummary } from "@/lib/items";
import { filterByDisplayName } from "@/lib/items";
import { weekStartTuesday, weekEndMonday } from "@/lib/weeks";
import { CURATED_ITEMS, DEFAULT_ITEM } from "@/lib/curated";
import { SaleHeatmap } from "@/components/heatmap/SaleHeatmap";
import { ItemSelector } from "@/components/controls/ItemSelector";
import {
  DateRangeTabs,
  type RangeSelection,
} from "@/components/controls/DateRangeTabs";
import { useDashboardParams } from "@/hooks/useDashboardParams";

type Props = {
  sales: PurchaseSaleRow[];
  items: ItemSummary[];
  fullStartIso: string;
  fullEndIso: string;
  realm: string;
};

export function Dashboard({
  sales,
  items,
  fullStartIso,
  fullEndIso,
  realm,
}: Props) {
  const fullStart = useMemo(() => new Date(fullStartIso), [fullStartIso]);
  const fullEnd = useMemo(() => new Date(fullEndIso), [fullEndIso]);

  const { params, setParams } = useDashboardParams();

  const item = isKnownItem(items, params.item) ? params.item! : DEFAULT_ITEM;
  const range = parseRange(params, fullStart, fullEnd);

  const filtered = useMemo(() => {
    const itemRows = filterByDisplayName(sales, item);
    if (range.kind === "all") return itemRows;
    const startMs =
      range.kind === "week"
        ? range.weekStart.getTime()
        : range.start.getTime();
    const endMs =
      range.kind === "week"
        ? weekEndMonday(range.weekStart).getTime()
        : range.end.getTime();
    return itemRows.filter((r) => {
      const t = r.time * 1000;
      return t >= startMs && t <= endMs;
    });
  }, [sales, item, range]);

  return (
    <div className="flex flex-col gap-5">
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
        <Field label={`Range (${realm})`}>
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

      <SaleHeatmap rows={filtered} itemName={item} />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[#666]">
        {label}
      </span>
      {children}
    </div>
  );
}

function isKnownItem(items: ItemSummary[], name: string | null): boolean {
  if (!name) return false;
  if ((CURATED_ITEMS as readonly string[]).includes(name)) return true;
  return items.some((i) => i.name === name);
}

function parseRange(
  params: ReturnType<typeof useDashboardParams>["params"],
  fullStart: Date,
  fullEnd: Date,
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
  if (params.range === "all") return { kind: "all" };
  return { kind: "all" };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
