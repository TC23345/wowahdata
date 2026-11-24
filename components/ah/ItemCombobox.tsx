"use client";

import { useMemo, useRef, useState } from "react";
import { Popover } from "@/components/shell/Popover";
import { searchItems, type ItemSummary } from "@/lib/items";

// Item search modelled on the auction house search bar plus its browse list:
// one fixed-width field that always shows the current subject, and a results
// list that opens over the page rather than pushing it down. Selecting any
// item — pinned or not, short name or long — changes text inside the same box.

type Props = {
  items: ItemSummary[];
  pinned: string[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  /** Shown instead of the item when the workspace has no single subject. */
  placeholder?: string;
};

export function ItemCombobox({ items, pinned, value, onChange, disabled, placeholder }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim();
    if (q) return [{ heading: `Matching “${q}”`, items: searchItems(items, q).slice(0, 60) }];
    const pinnedItems = pinned.map((n) => items.find((i) => i.name === n)).filter((i): i is ItemSummary => Boolean(i));
    const top = items.filter((i) => !pinned.includes(i.name) && !i.isSynthetic).slice(0, 40);
    return [
      { heading: "Pinned", items: pinnedItems },
      { heading: "Most traded", items: top },
    ];
  }, [items, pinned, query]);
  const flat = results.flatMap((s) => s.items);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const choose = (name: string) => {
    onChange(name);
    close();
    inputRef.current?.blur();
  };

  return (
    <div ref={anchorRef} className="relative h-8 w-[260px] flex-none">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="item-combobox-list"
        aria-label="Item"
        disabled={disabled}
        value={open ? query : disabled ? placeholder ?? "" : value}
        placeholder={open ? `Search ${items.length.toLocaleString("en-US")} items…` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(flat.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && flat[active]) {
            choose(flat[active].name);
          } else if (e.key === "Escape") {
            close();
            inputRef.current?.blur();
          }
        }}
        className={`h-8 w-full truncate rounded-md border px-3 pr-8 text-[13px] font-semibold outline-none ${
          disabled
            ? "border-[#333] bg-[#1d1d1d] text-[#999]"
            : "border-[#5dcaa5] bg-[#1f2a26] text-[#e0e0e0] placeholder:font-normal placeholder:text-[#999] focus:border-[#7fdab8]"
        }`}
      />
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="pointer-events-none absolute right-3 top-[11px] fill-none stroke-[#5dcaa5] stroke-[1.5]">
        <path d="M2 4l3 3 3-3" />
      </svg>
      <Popover open={open && !disabled} onClose={close} anchorRef={anchorRef} width={340} label="Choose an item">
        <div id="item-combobox-list" role="listbox" className="py-1">
          {results.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.heading}>
                <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-[#999]">{section.heading}</p>
                {section.items.map((it) => {
                  const idx = flat.indexOf(it);
                  return (
                    <button
                      key={it.name}
                      type="button"
                      role="option"
                      aria-selected={it.name === value}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => choose(it.name)}
                      className={`flex h-8 w-full items-center justify-between gap-2 px-3 text-left text-[13px] ${
                        idx === active ? "bg-[#252525]" : ""
                      } ${it.name === value ? "text-[#5dcaa5]" : "text-[#e0e0e0]"}`}
                    >
                      <span className="truncate">{it.name}</span>
                      <span className="flex-none text-xs text-[#999]">{it.txnCount.toLocaleString("en-US")} rows</span>
                    </button>
                  );
                })}
              </div>
            ),
          )}
          {flat.length === 0 && <p className="px-3 py-3 text-center text-xs text-[#999]">No items match.</p>}
        </div>
      </Popover>
    </div>
  );
}
