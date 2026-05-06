# Upgrade Guide - Tailwind CSS v3 to v4

> Source: https://tailwindcss.com/docs/upgrade-guide

Tailwind CSS v4.0 is a major version with necessary breaking changes. This guide covers upgrading from v3 to v4.

**Browser Requirements:** Tailwind CSS v4.0 is designed for Safari 16.4+, Chrome 111+, and Firefox 128+. Use v3.4 if you need to support older browsers.

## Using the Upgrade Tool

The easiest path to upgrade is using the automated upgrade tool:

```
$ npx @tailwindcss/upgrade
```

This tool:
- Updates dependencies
- Migrates your configuration file to CSS
- Handles template file changes
- Requires Node.js 20 or higher

**Recommendation:** Run in a new branch, review the diff carefully, and test in the browser.

## Upgrading Manually

### Using PostCSS

In v4, the PostCSS plugin lives in `@tailwindcss/postcss`:

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Remove `postcss-import` and `autoprefixer` — v4 handles these automatically.

### Using Vite

Migrate to the dedicated Vite plugin for better performance:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

### Using Tailwind CLI

Update to the new `@tailwindcss/cli` package:

```
npx @tailwindcss/cli -i input.css -o output.css
```

## Key Breaking Changes

### Removed @tailwind Directives

Replace `@tailwind` directives with a CSS import:

```css
/* v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 */
@import "tailwindcss";
```

### Removed Deprecated Utilities

| Deprecated | Replacement |
|-----------|------------|
| `bg-opacity-*` | `bg-black/50` |
| `text-opacity-*` | `text-black/50` |
| `border-opacity-*` | `border-black/50` |
| `divide-opacity-*` | `divide-black/50` |
| `ring-opacity-*` | `ring-black/50` |
| `placeholder-opacity-*` | `placeholder-black/50` |
| `flex-shrink-*` | `shrink-*` |
| `flex-grow-*` | `grow-*` |
| `overflow-ellipsis` | `text-ellipsis` |

### Renamed Utilities

| v3 | v4 |
|----|-----|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `drop-shadow-sm` | `drop-shadow-xs` |
| `drop-shadow` | `drop-shadow-sm` |
| `blur-sm` | `blur-xs` |
| `blur` | `blur-sm` |
| `backdrop-blur-sm` | `backdrop-blur-xs` |
| `backdrop-blur` | `backdrop-blur-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |
| `outline-none` | `outline-hidden` |
| `ring` | `ring-3` |

### Ring and Outline Changes

The `ring` utility now adds `1px` (was `3px`) and defaults to `currentColor` (was `blue-500`):

```html
<!-- v3 -->
<button class="ring ring-blue-500"></button>

<!-- v4 -->
<button class="ring-3 ring-blue-500"></button>
```

The `outline` utility now sets `outline-width: 1px` by default:

```html
<!-- v3 -->
<input class="outline outline-2" />

<!-- v4 -->
<input class="outline-2" />
```

### Space and Divide Selector Changes

For performance, selectors now use `:not(:last-child)` instead of `:not([hidden]) ~ :not([hidden])`:

```css
/* Before */
.space-y-4 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 1rem;
}

/* Now */
.space-y-4 > :not(:last-child) {
  margin-bottom: 1rem;
}
```

Migrate to flex/grid with `gap` for better control:

```html
<!-- Before -->
<div class="space-y-4 p-4">

<!-- After -->
<div class="flex flex-col gap-4 p-4">
```

### Default Border Color

Borders now use `currentColor` instead of `gray-200`:

```html
<div class="border border-gray-200 px-2 py-3">
```

### Important Modifier Position

Place `!` at the end of the class name:

```html
<!-- v3 -->
<div class="!flex !bg-red-500">

<!-- v4 -->
<div class="flex! bg-red-500!">
```

### Variables in Arbitrary Values

Use parentheses for CSS variable shorthand:

```html
<!-- v3 -->
<div class="bg-[--brand-color]"></div>

<!-- v4 -->
<div class="bg-(--brand-color)"></div>
```

### Arbitrary Values in Grid

Use underscores instead of commas for spaces:

```html
<!-- v3 -->
<div class="grid-cols-[max-content,auto]"></div>

<!-- v4 -->
<div class="grid-cols-[max-content_auto]"></div>
```

### Prefix Syntax

Prefixes now look like variants at the beginning:

```html
<div class="tw:flex tw:bg-red-500 tw:hover:bg-red-600">
```

### Variant Stacking Order

Variants now apply left to right (was right to left):

```html
<!-- v3 -->
<ul class="first:*:pt-0 last:*:pb-0">

<!-- v4 -->
<ul class="*:first:pt-0 *:last:pb-0">
```

### Custom Utilities

Use the `@utility` directive instead of `@layer utilities`:

```css
/* v3 */
@layer utilities {
  .tab-4 {
    tab-size: 4;
  }
}

/* v4 */
@utility tab-4 {
  tab-size: 4;
}
```

### Transform Properties

Reset transforms individually instead of with `transform-none`:

```html
<!-- v3 -->
<button class="scale-150 focus:transform-none"></button>

<!-- v4 -->
<button class="scale-150 focus:scale-none"></button>
```

### Theme Function

Use CSS variables instead of `theme()` when possible:

```css
/* v3 */
background-color: theme(colors.red.500);

/* v4 */
background-color: var(--color-red-500);
```

For cases requiring `theme()`, use CSS variable names:

```css
/* v3 */
@media (width >= theme(screens.xl))

/* v4 */
@media (width >= theme(--breakpoint-xl))
```

### JavaScript Config

Auto-detection is removed. Load explicitly with `@config`:

```css
@config "../../tailwind.config.js";
```

The `corePlugins`, `safelist`, and `separator` options are not supported in v4.

### CSS Modules and @apply

Stylesheets bundled separately don't have access to theme variables. Use `@reference`:

```vue
<style>
  @reference "../../app.css";
  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

Or use CSS variables directly:

```vue
<style>
  h1 {
    color: var(--text-red-500);
  }
</style>
```

### Preprocessors Not Supported

Tailwind CSS v4 is not compatible with Sass, Less, or Stylus. Tailwind is your preprocessor.
