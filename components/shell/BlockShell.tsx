"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SizeToken } from "@/lib/layout";

export type BlockStatus =
  | { kind: "ready" }
  | { kind: "loading" }
  | { kind: "empty"; message: string }
  | { kind: "error"; message: string }
  | { kind: "unavailable"; message: string };

export type ReadoutField = { label: string; value: ReactNode };

/** Which zones a block has. Declared once per block type; never changes at runtime. */
export type Chrome = { toolbar: boolean; readout: boolean; footer: boolean };

export type BlockSlot = { id: string; size: SizeToken };

type Props = {
  slot: BlockSlot;
  title: string;
  chrome: Chrome;
  status: BlockStatus;
  summary?: ReactNode;
  /** Previous data is on screen while the next result computes. */
  stale?: boolean;
  /** Dataset-level caveat, shown as a dot in the header (text in its title). */
  caveat?: string;
  /** Always enabled, even when the body has no data: the view switcher lives here. */
  toolbarLead?: ReactNode;
  toolbar?: ReactNode;
  readout?: { fields: ReadoutField[] | null; idle: string };
  footer?: ReactNode;
  children?: ReactNode;
};

const READOUT_COLUMN = 128;

/**
 * The one box every block draws into (docs/forever/04-layout-system.md §4).
 *
 * The grid sizes the root from `slot.size`; containment guarantees nothing
 * inside can change that size. Header, toolbar, readout and footer are fixed
 * heights and exist according to `chrome`, so they never appear or vanish.
 * Every status — loading, ready, stale, empty, error, unavailable — renders in
 * the same body rectangle.
 */
export function BlockShell({ slot, title, chrome, status, summary, stale, caveat, toolbarLead, toolbar, readout, footer, children }: Props) {
  const live = status.kind === "ready";
  return (
    <section className="block" data-size={slot.size} data-block-id={slot.id} aria-label={title} aria-busy={stale || status.kind === "loading"}>
      <header className="block-header">
        <h2 className="flex-none text-[13px] font-semibold text-[#e0e0e0]">{title}</h2>
        {status.kind === "unavailable" && (
          <span className="flex-none rounded border border-[#444] px-1.5 text-[11px] text-[#999]">unavailable</span>
        )}
        <div className="min-w-0 flex-1 truncate text-xs text-[#999]">{live ? summary : null}</div>
        <span className="h-4 w-4 flex-none" aria-hidden={!stale}>
          {stale && <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#444] border-t-[#5dcaa5]" />}
        </span>
        <span className="h-4 w-4 flex-none" title={caveat}>
          {caveat && <span className="m-1 block h-2 w-2 rounded-full bg-[#ffd100]" aria-label={caveat} />}
        </span>
      </header>
      {chrome.toolbar && (
        <div className="block-toolbar">
          {toolbarLead}
          <fieldset disabled={!live} className={`flex min-w-0 items-center gap-2 ${live ? "" : "opacity-50"}`}>
            {toolbar}
          </fieldset>
        </div>
      )}
      <div className="block-body">
        <div className="absolute inset-0" style={{ opacity: stale ? 0.6 : 1 }}>
          <Body status={status}>{children}</Body>
        </div>
      </div>
      {chrome.readout && <Readout fields={live ? readout?.fields ?? null : null} idle={live ? readout?.idle ?? "" : ""} />}
      {chrome.footer && <footer className="block-footer">{live ? footer : null}</footer>}
    </section>
  );
}

function Body({ status, children }: { status: BlockStatus; children?: ReactNode }) {
  switch (status.kind) {
    case "ready":
      return <>{children}</>;
    case "loading":
      return (
        <div className="flex h-full items-end gap-2 px-4 pb-4 pt-6" aria-label="Loading">
          {[30, 45, 38, 60, 52, 70, 48, 35].map((h, i) => (
            <div key={i} className="skeleton flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case "empty":
      return <Centered className="text-[#999]">{status.message}</Centered>;
    case "unavailable":
      return <Centered className="text-[#e0e0e0]">{status.message}</Centered>;
    case "error":
      return <Centered className="text-[#f07b7a]">{status.message}</Centered>;
  }
}

function Centered({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex h-full items-center justify-center px-7 text-center text-[13px] leading-5 ${className ?? ""}`}>
      <p className="max-w-md">{children}</p>
    </div>
  );
}

/**
 * Fixed-width columns in priority order: the block lists its fields most
 * important first and the readout shows as many whole columns as fit. Hover or
 * focus fills it; it is the same height either way.
 */
function Readout({ fields, idle }: { fields: ReadoutField[] | null; idle: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCapacity(Math.max(1, Math.floor(entry.contentRect.width / READOUT_COLUMN)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="block-readout" aria-live="polite">
      {fields ? (
        fields.slice(0, capacity).map((f) => (
          <div key={f.label} className="flex flex-none flex-col overflow-hidden" style={{ width: READOUT_COLUMN }}>
            <span className="truncate text-[10px] uppercase leading-[14px] tracking-wide text-[#999]">{f.label}</span>
            <span className="truncate text-[13px] leading-[18px] text-[#e0e0e0]">{f.value}</span>
          </div>
        ))
      ) : (
        <p className="truncate text-xs text-[#999]">{idle}</p>
      )}
    </div>
  );
}

/** Fixed-anatomy KPI card: label, value, sub-line — each one truncated line. */
export function KpiCard({
  slotId,
  label,
  value,
  sub,
  loading,
}: {
  slotId: string;
  label: string;
  value: ReactNode;
  sub: string;
  loading?: boolean;
}) {
  return (
    <section className="block kpi" data-size="kpi" data-block-id={slotId} aria-label={label}>
      <p className="truncate text-[11px] font-medium uppercase leading-4 tracking-wide text-[#999]">{label}</p>
      <div className="truncate text-xl font-semibold leading-7 text-[#e0e0e0]">
        {loading ? <span className="skeleton inline-block h-5 w-24 align-middle" /> : value}
      </div>
      <p className="truncate text-[11px] leading-[14px] text-[#999]">{loading ? " " : sub}</p>
    </section>
  );
}
