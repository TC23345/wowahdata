# Theme Variables - Core Concepts

> Source: https://tailwindcss.com/docs/theme

Using utility classes as an API for your design tokens.

## Overview

Tailwind is a framework for building custom designs, and different designs need different typography, colors, shadows, breakpoints, and more. These low-level design decisions are called _design tokens_, and in Tailwind projects you store those values in _theme variables_.

### What are theme variables?

Theme variables are special CSS variables defined using the `@theme` directive that influence which utility classes exist in your project.

For example, you can add a new color to your project by defining a theme variable like `--color-mint-500`:

```css
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

Now you can use utility classes like `bg-mint-500`, `text-mint-500`, or `fill-mint-500` in your HTML:

```html
<div class="bg-mint-500">
  <!-- ... -->
</div>
```

Tailwind also generates regular CSS variables for your theme variables so you can reference your design tokens in arbitrary values or inline styles:

```html
<div style="background-color: var(--color-mint-500)">
  <!-- ... -->
</div>
```

#### Why `@theme` instead of `:root`?

Theme variables aren't _just_ CSS variables — they also instruct Tailwind to create new utility classes that you can use in your HTML. Since they do more than regular CSS variables, Tailwind uses special syntax so that defining theme variables is always explicit. Use `@theme` when you want a design token to map directly to a utility class, and use `:root` for defining regular CSS variables that shouldn't have corresponding utility classes.

### Relationship to utility classes

Some utility classes like `flex` and `object-cover` are static. But many others are driven by theme variables. For example, theme variables defined in the `--font-*` namespace determine all of the `font-family` utilities that exist in a project:

```css
@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
```

If another theme variable like `--font-poppins` were defined, a `font-poppins` utility class would become available:

```css
@import "tailwindcss";

@theme {
  --font-poppins: Poppins, sans-serif;
}
```

```html
<h1 class="font-poppins">This headline will use Poppins.</h1>
```

#### Relationship to variants

Some theme variables are used to define variants rather than utilities. For example theme variables in the `--breakpoint-*` namespace determine which responsive breakpoint variants exist in your project:

```css
@import "tailwindcss";

@theme {
  --breakpoint-3xl: 120rem;
}
```

Now you can use the `3xl:*` variant:

```html
<div class="3xl:grid-cols-6 grid grid-cols-2 md:grid-cols-4">
  <!-- ... -->
</div>
```

### Theme variable namespaces

Theme variables are defined in _namespaces_ and each namespace corresponds to one or more utility class or variant APIs.

| Namespace | Utility classes |
|-----------|-----------------|
| `--color-*` | Color utilities like `bg-red-500`, `text-sky-300`, and many more |
| `--font-*` | Font family utilities like `font-sans` |
| `--text-*` | Font size utilities like `text-xl` |
| `--font-weight-*` | Font weight utilities like `font-bold` |
| `--tracking-*` | Letter spacing utilities like `tracking-wide` |
| `--leading-*` | Line height utilities like `leading-tight` |
| `--breakpoint-*` | Responsive breakpoint variants like `sm:*` |
| `--container-*` | Container query variants like `@sm:*` and size utilities like `max-w-md` |
| `--spacing-*` | Spacing and sizing utilities like `px-4`, `max-h-16`, and many more |
| `--radius-*` | Border radius utilities like `rounded-sm` |
| `--shadow-*` | Box shadow utilities like `shadow-md` |
| `--inset-shadow-*` | Inset box shadow utilities like `inset-shadow-xs` |
| `--drop-shadow-*` | Drop shadow filter utilities like `drop-shadow-md` |
| `--blur-*` | Blur filter utilities like `blur-md` |
| `--perspective-*` | Perspective utilities like `perspective-near` |
| `--aspect-*` | Aspect ratio utilities like `aspect-video` |
| `--ease-*` | Transition timing function utilities like `ease-out` |
| `--animate-*` | Animation utilities like `animate-spin` |

## Customizing your theme

### Extending the default theme

Use `@theme` to define new theme variables and extend the default theme:

```css
@import "tailwindcss";

@theme {
  --font-script: Great Vibes, cursive;
}
```

```html
<p class="font-script">This will use the Great Vibes font family.</p>
```

### Overriding the default theme

Override a default theme variable value by redefining it within `@theme`:

```css
@import "tailwindcss";

@theme {
  --breakpoint-sm: 30rem;
}
```

Now the `sm:*` variant will trigger at 30rem instead of the default 40rem viewport size.

To completely override an entire namespace, set the entire namespace to `initial`:

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-purple: #3f3cbb;
  --color-midnight: #121063;
  --color-tahiti: #3ab7bf;
  --color-bermuda: #78dcca;
}
```

### Using a custom theme

To completely disable the default theme and use only custom values, set the global theme variable namespace to `initial`:

```css
@import "tailwindcss";

@theme {
  --*: initial;
  --spacing: 4px;
  --font-body: Inter, sans-serif;
  --color-lagoon: oklch(0.72 0.11 221.19);
  --color-coral: oklch(0.74 0.17 40.24);
  --color-driftwood: oklch(0.79 0.06 74.59);
  --color-tide: oklch(0.49 0.08 205.88);
  --color-dusk: oklch(0.82 0.15 72.09);
}
```

### Defining animation keyframes

Define the `@keyframes` rules for your `--animate-*` theme variables within `@theme`:

```css
@import "tailwindcss";

@theme {
  --animate-fade-in-scale: fade-in-scale 0.3s ease-out;

  @keyframes fade-in-scale {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
}
```

### Referencing other variables

When defining theme variables that reference other variables, use the `inline` option:

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter);
}
```

Using the `inline` option, the utility class will use the theme variable _value_ instead of referencing the actual theme variable.

### Generating all CSS variables

By default only used CSS variables will be generated in the final CSS output. If you want to always generate all CSS variables, use the `static` theme option:

```css
@import "tailwindcss";

@theme static {
  --color-primary: var(--color-red-500);
  --color-secondary: var(--color-blue-500);
}
```

### Sharing across projects

Since theme variables are defined in CSS, sharing them across projects is straightforward:

```css
/* ./packages/brand/theme.css */
@theme {
  --*: initial;
  --spacing: 4px;
  --font-body: Inter, sans-serif;
  --color-lagoon: oklch(0.72 0.11 221.19);
  --color-coral: oklch(0.74 0.17 40.24);
  --color-driftwood: oklch(0.79 0.06 74.59);
  --color-tide: oklch(0.49 0.08 205.88);
  --color-dusk: oklch(0.82 0.15 72.09);
}
```

Then import in other projects:

```css
/* ./packages/admin/app.css */
@import "tailwindcss";
@import "../brand/theme.css";
```

## Using your theme variables

All of your theme variables are turned into regular CSS variables when you compile your CSS, making it easy to reference all of your design tokens in any of your custom CSS or inline styles.

### With custom CSS

Use your theme variables when writing custom CSS:

```css
@import "tailwindcss";

@layer components {
  .typography {
    p {
      font-size: var(--text-base);
      color: var(--color-gray-700);
    }
    h1 {
      font-size: var(--text-2xl--line-height);
      font-weight: var(--font-weight-semibold);
      color: var(--color-gray-950);
    }
    h2 {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-gray-950);
    }
  }
}
```

### With arbitrary values

Using theme variables in arbitrary values can be useful, especially with the `calc()` function:

```html
<div class="relative rounded-xl">
  <div class="absolute inset-px rounded-[calc(var(--radius-xl)-1px)]">
    <!-- ... -->
  </div>
  <!-- ... -->
</div>
```

### Referencing in JavaScript

Most of the time when you need to reference your theme variables in JS you can just use the CSS variables directly:

```jsx
<motion.div animate={{ backgroundColor: "var(--color-blue-500)" }} />
```

If you need access to a resolved CSS variable value in JS, use `getComputedStyle`:

```javascript
let styles = getComputedStyle(document.documentElement);
let shadow = styles.getPropertyValue("--shadow-xl");
```
