# Tailwind CSS v4 docs — local mirror

Compiled from https://tailwindcss.com/docs (May 2026, against Tailwind 4.2.x). Tailwind does NOT ship docs in npm, so these were fetched and saved as flat markdown.

| File | Covers |
|---|---|
| `installation-postcss.md` | PostCSS setup steps; the canonical install path for this Next.js project |
| `installation-nextjs.md` | Next.js-specific install snippet (`postcss.config.mjs`, `globals.css` import) |
| `styling-with-utility-classes.md` | Mental model — utilities, arbitrary values, class composition, conflict resolution, `important` modifier, prefixes |
| `theme.md` | The `@theme` directive — namespaces (`--color-*`, `--font-*`, `--breakpoint-*`, etc.), overriding defaults, `@theme inline`, `@theme static`, animation keyframes |
| `functions-and-directives.md` | **CRITICAL.** Every Tailwind directive: `@import`, `@theme`, `@source`, `@utility`, `@variant`, `@custom-variant`, `@apply`, `@reference`, plus v3-compat `@config`, `@plugin`, `theme()`. Build-time fns `--alpha()` and `--spacing()`. |
| `adding-custom-styles.md` | When to reach for arbitrary values vs. custom CSS vs. `@layer base/components` vs. `@utility`. Functional utilities with `--value()` / `--modifier()`. Custom variants. |
| `colors.md` | Default 11-step palette, opacity-slash syntax (`bg-sky-500/75`), `--alpha()`, customizing/overriding/disabling colors, `@theme inline` for color refs |
| `responsive-design.md` | Breakpoints (`sm`/`md`/`lg`/`xl`/`2xl`), `max-*` ranges, mobile-first rule, custom breakpoints, container queries (`@container`, `@md:`, `@max-md:`, named, sized) — built into v4, no plugin |
| `dark-mode.md` | `prefers-color-scheme` default, manual class toggle via `@custom-variant dark (&:where(.dark, .dark *))`, data-attribute variant, three-way system-aware toggle JS |
| `hover-focus-and-other-states.md` | All variants — pseudo-classes (hover/focus/has/not), pseudo-elements (before/after/placeholder/file/marker/selection/first-line/first-letter/backdrop), media queries, ARIA/data attributes, child selectors (`*` and `**`), arbitrary variants |
| `upgrade-guide.md` | v3 → v4 breaking changes. Read when something looks unfamiliar — renamed utilities (`shadow-sm`→`shadow-xs`, `ring`→`ring-3`, etc.), removed opacity utilities, important-modifier syntax change, `@layer utilities` → `@utility`, theme function changes |
| `typography-plugin.md` | `prose`, `prose-<color>`, size scale, `prose-invert`, element modifiers (`prose-h1:…`, `prose-img:rounded-xl`, etc.), `not-prose`, custom color themes via `@utility prose-<name>` |

For project-specific patterns and a curated digest, also see `../tailwind-4.2.md`.
