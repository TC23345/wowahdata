"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type DashboardParams = {
  item: string | null;
  range: string | null; // 'all' | 'week:YYYY-MM-DD' | 'custom'
  start: string | null; // YYYY-MM-DD when range === 'custom'
  end: string | null;
  tab: string | null; // 'heatmap' | 'scatter' | 'pnl' | 'histogram'
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

  return { params, setParams };
}
