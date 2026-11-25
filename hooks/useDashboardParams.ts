"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type DashboardParams = {
  item: string | null;
  range: string | null; // 'all' | 'week:YYYY-MM-DD' | 'custom'
  start: string | null; // YYYY-MM-DD when range === 'custom'
  end: string | null;
  tab: string | null; // legacy one-chart-per-tab URLs; mapped onto workspaces
  ws: string | null; // legacy workspaces; mapped onto pages
  tz: string | null; // 'local' | 'utc'
  view: string | null; // the chart view on this page
  scope: string | null; // 'item' | 'pipeline' | 'all', on pages that offer more than one
};

export function useDashboardParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params: DashboardParams = useMemo(
    () => ({
      item: searchParams.get("item"),
      range: searchParams.get("range"),
      start: searchParams.get("start"),
      end: searchParams.get("end"),
      tab: searchParams.get("tab"),
      ws: searchParams.get("ws"),
      tz: searchParams.get("tz"),
      view: searchParams.get("view"),
      scope: searchParams.get("scope"),
    }),
    [searchParams],
  );

  const setParams = useCallback(
    (next: Partial<DashboardParams>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  /** The current query with some keys changed, for links to other pages. */
  const queryWith = useCallback(
    (next: Partial<DashboardParams>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      return qs ? `?${qs}` : "";
    },
    [searchParams],
  );

  return { params, setParams, queryWith };
}
