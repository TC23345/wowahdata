"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CURATED_ITEMS } from "@/lib/curated";
import type { ItemSummary } from "@/lib/items";
import { searchItems } from "@/lib/items";

const VISIBLE_CHIP_COUNT = 5;

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

  // Top N curated items that have activity in the loaded dataset, sorted by
  // transaction count descending. Items with zero activity drop off — no
  // point pinning a chip when there's no data behind it.
  const visibleChips = useMemo(() => {
    const curatedActive = CURATED_ITEMS
      .map((name) => itemsByName.get(name))
      .filter((i): i is ItemSummary => Boolean(i && i.txnCount > 0))
      .sort((a, b) => b.txnCount - a.txnCount);
    return curatedActive.slice(0, VISIBLE_CHIP_COUNT);
  }, [itemsByName]);

  const isCurated = (name: string): boolean =>
    (CURATED_ITEMS as readonly string[]).includes(name);

  const isVisible = (name: string): boolean =>
    visibleChips.some((c) => c.name === name);

  // If the active item is non-curated OR a curated item that didn't make the
  // top-N visible chips, render it as a temporary "pinned" chip with × so
  // the user can clear back to the default. This way the active selection
  // is always visible somewhere in the chip row.
  const activePinned =
    !isVisible(value) && itemsByName.get(value) ? itemsByName.get(value)! : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ItemSearchInput items={items} value={value} onChange={onChange} />
      {visibleChips.map((item) => (
        <Chip
          key={item.name}
          item={item}
          active={item.name === value}
          onClick={() => onChange(item.name)}
        />
      ))}
      {activePinned && (
        <Chip
          item={activePinned}
          active
          onClick={() => onChange(activePinned.name)}
          dismissible
          onDismiss={() => onChange("Arcane Dust")}
          showCuratedBadge={!isCurated(activePinned.name)}
        />
      )}
    </div>
  );
}

function Chip({
  item,
  active,
  onClick,
  dismissible,
  onDismiss,
  showCuratedBadge,
}: {
  item: ItemSummary;
  active: boolean;
  onClick: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  showCuratedBadge?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center overflow-hidden rounded-full border text-xs ${
        active
          ? "border-accent bg-accent-soft text-text-primary"
          : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary"
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
            active ? "bg-background text-accent" : "bg-background text-text-muted"
          }`}
        >
          {formatCount(item.txnCount)}
        </span>
        {item.isSynthetic && (
          <span className="rounded bg-border px-1 py-0.5 text-[9px] uppercase tracking-wide text-text-secondary">
            DE
          </span>
        )}
        {showCuratedBadge && !item.isSynthetic && (
          <span className="rounded bg-border px-1 py-0.5 text-[9px] uppercase tracking-wide text-text-secondary">
            search
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
          className="border-l border-accent/40 px-2 py-1.5 text-accent hover:bg-background"
        >
          ×
        </button>
      )}
    </span>
  );
}

function ItemSearchInput({
  items,
  value,
  onChange,
}: {
  items: ItemSummary[];
  value: string;
  onChange: (next: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchItems(items, query).slice(0, 50);
  }, [items, query]);

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        className={`flex items-center rounded-full border bg-background transition-colors ${
          open ? "border-text-muted" : "border-border hover:border-border-strong"
        }`}
      >
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) select(results[0].name);
            if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={`Search ${items.length.toLocaleString()} items…`}
          className="w-44 bg-transparent py-1.5 pr-3 text-xs text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 z-20 mt-2 max-h-72 w-72 overflow-auto rounded-md border border-border bg-background shadow-xl"
        >
          {results.map((i) => (
            <li key={i.name}>
              <button
                type="button"
                role="option"
                aria-selected={i.name === value}
                onClick={() => select(i.name)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface ${
                  i.name === value
                    ? "bg-surface text-text-primary"
                    : "text-text-secondary"
                }`}
              >
                <span className="truncate">{i.name}</span>
                <span className="shrink-0 text-xs text-text-muted">
                  {i.txnCount.toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="absolute left-0 z-20 mt-2 w-72 rounded-md border border-border bg-background px-3 py-3 text-center text-xs text-text-muted shadow-xl">
          No items match &quot;{query}&quot;.
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="ml-3 mr-1.5 shrink-0 text-text-muted"
      aria-hidden
    >
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 11L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString();
}
