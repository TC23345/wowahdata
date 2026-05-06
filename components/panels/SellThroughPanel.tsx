"use client";

import { useMemo, useState } from "react";
import type { LoadedData } from "@/lib/csv";
import {
  buildSellThrough,
  SLOW_THRESHOLD,
  type SellThroughRow,
} from "@/lib/sellthrough";

type SortKey = "name" | "soldUnits" | "expiredUnits" | "rate";

type Props = {
  data: LoadedData;
  activeItem: string;
};

export function SellThroughPanel({ data, activeItem }: Props) {
  const rows = useMemo(() => buildSellThrough(data), [data]);
  const [sort, setSort] = useState<SortKey>("soldUnits");
  const [hideEmpty, setHideEmpty] = useState(true);

  const sorted = useMemo(() => {
    const filtered = hideEmpty
      ? rows.filter((r) => r.soldRows + r.expiredRows > 0)
      : rows;
    const byKey: Record<SortKey, (a: SellThroughRow, b: SellThroughRow) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      soldUnits: (a, b) => b.soldUnits - a.soldUnits,
      expiredUnits: (a, b) => b.expiredUnits - a.expiredUnits,
      rate: (a, b) => b.rate - a.rate,
    };
    return [...filtered].sort(byKey[sort]);
  }, [rows, sort, hideEmpty]);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-[#333] bg-[#252525] p-6 text-sm text-[#999]">
        Load some sales/expired data first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#333] bg-[#252525] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[#e0e0e0]">Sell-through</h3>
          <p className="text-xs text-[#666]">
            {sorted.length} item{sorted.length === 1 ? "" : "s"} ·{" "}
            <span className="text-[#e24b4a]">red rows</span> = sell-through &lt;{" "}
            {(SLOW_THRESHOLD * 100).toFixed(0)}%
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#999]">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
          />
          Hide items with no sales+expired activity
        </label>
      </header>
      <div className="max-h-[480px] overflow-auto rounded border border-[#333]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#1a1a1a] text-[10px] uppercase tracking-wide text-[#666]">
            <tr>
              <Th onClick={() => setSort("name")} active={sort === "name"} align="left">
                Item
              </Th>
              <Th onClick={() => setSort("soldUnits")} active={sort === "soldUnits"} align="right">
                Sold (rows · units)
              </Th>
              <Th onClick={() => setSort("expiredUnits")} active={sort === "expiredUnits"} align="right">
                Expired (rows · units)
              </Th>
              <Th onClick={() => setSort("rate")} active={sort === "rate"} align="right">
                Sell-through
              </Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const slow = r.rate < SLOW_THRESHOLD && r.soldRows + r.expiredRows >= 3;
              const isActive = r.name === activeItem;
              return (
                <tr
                  key={r.name}
                  className={`border-t border-[#333] ${
                    isActive ? "bg-[#1f2a26]" : ""
                  } ${slow ? "text-[#e24b4a]" : "text-[#e0e0e0]"}`}
                >
                  <td className="px-3 py-1.5">
                    {r.name}
                    {r.isSynthetic && (
                      <span className="ml-2 rounded bg-[#333] px-1 py-0.5 text-[9px] text-[#999]">
                        synthetic
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.soldRows.toLocaleString()} · {r.soldUnits.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.expiredRows.toLocaleString()} · {r.expiredUnits.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.soldRows + r.expiredRows === 0
                      ? "—"
                      : `${(r.rate * 100).toFixed(0)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  align,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  align: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer px-3 py-2 ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-[#e0e0e0]" : ""}`}
    >
      {children} {active ? "↓" : ""}
    </th>
  );
}
