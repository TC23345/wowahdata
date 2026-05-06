"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CURATED_ITEMS } from "@/lib/curated";
import { SYNTHETIC_DE_GEAR } from "@/lib/csv";
import type { ItemSummary } from "@/lib/items";
import { searchItems } from "@/lib/items";

type Props = {
  items: ItemSummary[];
  value: string;
  onChange: (next: string) => void;
};

export function ItemChips({ items, value, onChange }: Props) {
  const itemsByName = useMemo(() => {
    const m = new Map<string, ItemSummary>();
    for (const i of items) m.set(i.name, i);
    return m;
  }, [items]);

  // Curated items that actually have activity in the loaded dataset, in
  // CURATED_ITEMS order. Items not in the dataset don't earn a chip slot.
  const curatedActive = useMemo(
    () =>
      CURATED_ITEMS.map((name) => itemsByName.get(name)).filter(
        (i): i is ItemSummary => Boolean(i && i.txnCount > 0),
      ),
    [itemsByName],
  );

  const isCurated = (name: string): boolean =>
    (CURATED_ITEMS as readonly string[]).includes(name);

  // If the active item is non-curated, render a temporary "pinned" chip so
  // the user can see it among the chips and clear back to the default.
  const activeNonCurated =
    !isCurated(value) && itemsByName.get(value) ? itemsByName.get(value)! : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {curatedActive.map((item) => (
        <Chip
          key={item.name}
          item={item}
          active={item.name === value}
          onClick={() => onChange(item.name)}
        />
      ))}
      {activeNonCurated && (
        <Chip
          item={activeNonCurated}
          active
          onClick={() => onChange(activeNonCurated.name)}
          dismissible
          onDismiss={() => onChange("Arcane Dust")}
        />
      )}
      <MorePopover items={items} value={value} onChange={onChange} />
    </div>
  );
}

function Chip({
  item,
  active,
  onClick,
  dismissible,
  onDismiss,
}: {
  item: ItemSummary;
  active: boolean;
  onClick: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center overflow-hidden rounded-full border text-xs ${
        active
          ? "border-[#5dcaa5] bg-[#1f2a26] text-[#e0e0e0]"
          : "border-[#333] bg-[#252525] text-[#999] hover:border-[#555] hover:text-[#e0e0e0]"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5"
      >
        <span>{item.name}</span>
        <span
          className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${
            active ? "bg-[#0e1916] text-[#5dcaa5]" : "bg-[#1a1a1a] text-[#666]"
          }`}
        >
          {formatCount(item.txnCount)}
        </span>
        {item.isSynthetic && (
          <span className="rounded bg-[#333] px-1 py-0.5 text-[9px] uppercase tracking-wide text-[#999]">
            DE
          </span>
        )}
      </button>
      {dismissible && (
        <button
          type="button"
          aria-label={`Clear ${item.name} selection`}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          className="border-l border-[#5dcaa5]/40 px-2 py-1.5 text-[#5dcaa5] hover:bg-[#0e1916]"
        >
          ×
        </button>
      )}
    </span>
  );
}

function MorePopover({
  items,
  value,
  onChange,
}: {
  items: ItemSummary[];
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalNonCurated = useMemo(
    () =>
      items.filter(
        (i) => !i.isSynthetic && !(CURATED_ITEMS as readonly string[]).includes(i.name),
      ).length,
    [items],
  );

  const results = useMemo(() => {
    const curatedSet = new Set<string>(CURATED_ITEMS);
    return searchItems(items, query).filter((i) => !curatedSet.has(i.name));
  }, [items, query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#999] hover:border-[#555] hover:text-[#e0e0e0]"
      >
        <span>All items</span>
        <span className="rounded bg-[#252525] px-1 py-0.5 text-[10px] tabular-nums text-[#666]">
          {totalNonCurated.toLocaleString()}
        </span>
        <Caret open={open} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-hidden rounded-md border border-[#333] bg-[#1a1a1a] shadow-xl">
          <div className="border-b border-[#333] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items by name…"
              className="w-full rounded border border-[#333] bg-[#252525] px-2 py-1.5 text-sm text-[#e0e0e0] outline-none placeholder:text-[#666] focus:border-[#666]"
            />
          </div>
          <ul className="max-h-72 overflow-auto">
            {results.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-[#666]">
                No items match "{query}".
              </li>
            )}
            {results.slice(0, 200).map((i) => (
              <li key={i.name}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(i.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#252525] ${
                    i.name === value
                      ? "bg-[#252525] text-[#e0e0e0]"
                      : "text-[#999]"
                  }`}
                >
                  <span className="truncate">{i.name}</span>
                  <span className="shrink-0 text-xs text-[#666]">
                    {i.txnCount.toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
            {results.length > 200 && (
              <li className="border-t border-[#333] px-3 py-2 text-xs text-[#666]">
                Showing first 200 of {results.length}. Refine search to see more.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      className={`text-[#666] transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

// Note: synthetic chips show "DE" badge instead of a literal "?".
void SYNTHETIC_DE_GEAR;
