"use client";

import { useEffect, useState } from "react";

const THEME_GROUPS = [
  {
    label: "Original",
    themes: [
      { id: "midnight", label: "Midnight" },
      { id: "ledger", label: "Ledger" },
      { id: "cobalt", label: "Cobalt" },
      { id: "ember", label: "Ember" },
    ],
  },
  {
    label: "TBC",
    themes: [
      { id: "fel-forge", label: "Fel Forge" },
      { id: "sunwell", label: "Sunwell Gold" },
      { id: "black-temple", label: "Black Temple" },
      { id: "illidari", label: "Illidari Blade" },
      { id: "outland", label: "Outland Skies" },
      { id: "arcane", label: "Arcane Crystal" },
      { id: "naaru", label: "Naaru Sanctum" },
      { id: "dh-tattoo", label: "Demon Hunter Tattoo" },
      { id: "auction-ledger", label: "Auction Ledger" },
      { id: "karazhan", label: "Karazhan Library" },
    ],
  },
] as const;

const THEME_IDS = THEME_GROUPS.flatMap((g) => g.themes.map((t) => t.id));
type ThemeId = (typeof THEME_IDS)[number];

const STORAGE_KEY = "wowahdata-theme";

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function onChange(next: ThemeId) {
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    const url = new URL(window.location.href);
    if (next === "midnight") url.searchParams.delete("theme");
    else url.searchParams.set("theme", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="text-text-muted">Style</span>
      <select
        value={theme}
        onChange={(e) => onChange(e.target.value as ThemeId)}
        className="rounded border border-border bg-surface px-2 py-1 text-text-primary outline-none hover:border-border-strong"
      >
        {THEME_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}

function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "midnight";
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isThemeId(fromUrl)) return fromUrl;
  if (isThemeId(stored)) return stored;
  return "midnight";
}

function isThemeId(value: string | null): value is ThemeId {
  return !!value && (THEME_IDS as readonly string[]).includes(value);
}
