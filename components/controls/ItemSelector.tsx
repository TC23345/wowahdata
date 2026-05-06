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

export function ItemSelector({ items, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const itemsByName = useMemo(() => {
    const m = new Map<string, ItemSummary>();
    for (const i of items) m.set(i.name, i);
    return m;
  }, [items]);

  const curated = useMemo(
    () =>
      CURATED_ITEMS.map((name) => itemsByName.get(name) ?? {
        name,
        txnCount: 0,
        isSynthetic: name === SYNTHETIC_DE_GEAR,
      }),
    [itemsByName],
  );

  const others = useMemo(() => {
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

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full max-w-xs">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-left text-sm text-[#e0e0e0] hover:border-[#555]"
      >
        <span className="truncate">{value}</span>
        <Caret open={open} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-96 w-full overflow-auto rounded-md border border-[#333] bg-[#1a1a1a] shadow-lg"
        >
          <div className="sticky top-0 border-b border-[#333] bg-[#1a1a1a] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="w-full rounded border border-[#333] bg-[#252525] px-2 py-1 text-sm text-[#e0e0e0] outline-none placeholder:text-[#666] focus:border-[#666]"
            />
          </div>
          <Group label="Curated">
            {curated.map((i) => (
              <Row
                key={i.name}
                item={i}
                active={i.name === value}
                onClick={() => select(i.name)}
              />
            ))}
          </Group>
          {others.length > 0 && (
            <Group label={query ? `Matches (${others.length})` : "All items"}>
              {others.slice(0, 200).map((i) => (
                <Row
                  key={i.name}
                  item={i}
                  active={i.name === value}
                  onClick={() => select(i.name)}
                />
              ))}
              {others.length > 200 && (
                <p className="px-3 py-1.5 text-xs text-[#666]">
                  Showing first 200 of {others.length}. Refine search.
                </p>
              )}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[#666]">
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function Row({
  item,
  active,
  onClick,
}: {
  item: ItemSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#252525] ${
          active ? "bg-[#252525] text-[#e0e0e0]" : "text-[#999]"
        }`}
      >
        <span className="truncate">{item.name}</span>
        <span className="shrink-0 text-xs text-[#666]">
          {item.txnCount > 0 ? item.txnCount.toLocaleString() : "—"}
        </span>
      </button>
    </li>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      className={`text-[#999] transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
