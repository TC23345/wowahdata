"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  width: number;
  align?: "start" | "end";
  label: string;
  children: ReactNode;
};

/**
 * An overlay rendered in the browser's top layer (the `popover` attribute), so
 * it is never clipped by a block's `contain: strict; overflow: hidden` or by an
 * overflow row, and never takes space in the page (layout law 4). Positioned
 * from the trigger's rect; closes on outside pointer-down or Escape.
 */
export function Popover({ open, onClose, anchorRef, width, align = "start", label, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const position = useCallback(() => {
    const el = ref.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const w = Math.min(width, vw - 16);
    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    el.style.width = `${w}px`;
    el.style.left = `${left}px`;
    el.style.top = `${r.bottom + 4}px`;
    el.style.maxHeight = `${Math.max(160, window.innerHeight - r.bottom - 16)}px`;
  }, [anchorRef, width, align]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shown = el.matches(":popover-open");
    if (open && !shown) {
      el.showPopover();
      position();
    } else if (!open && shown) {
      el.hidePopover();
    }
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onMove = () => position();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, onClose, anchorRef, position]);

  return (
    <div ref={ref} popover="manual" role="dialog" aria-label={label} className="popover-panel overflow-auto">
      {open ? children : null}
    </div>
  );
}
