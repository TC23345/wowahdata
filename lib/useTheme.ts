"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to changes on `<html data-theme="...">` and returns the current
 * theme id. Use the returned value as a React `key` on chart/legend elements
 * that read from CSS custom properties — it forces them to remount and
 * recompute colors on theme swap.
 *
 * Implemented with useSyncExternalStore so we (a) get a stable cross-tree
 * snapshot during a render, (b) match the initial server snapshot to "midnight"
 * deterministically, and (c) avoid the setState-in-effect anti-pattern.
 */
export function useTheme(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): string {
  if (typeof document === "undefined") return "midnight";
  return document.documentElement.dataset.theme || "midnight";
}

function getServerSnapshot(): string {
  return "midnight";
}
