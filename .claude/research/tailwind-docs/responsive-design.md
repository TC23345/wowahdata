# Responsive Design - Tailwind CSS

> Source: https://tailwindcss.com/docs/responsive-design

## Overview

Every utility class in Tailwind can be applied conditionally at different breakpoints. To use responsive utilities, first add the viewport meta tag to your document's `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Then prefix any utility with a breakpoint name followed by `:`:

```html
<!-- Width of 16 by default, 32 on medium screens, and 48 on large screens -->
<img class="w-16 md:w-32 lg:w-48" src="..." />
```

## Default Breakpoints

| Prefix | Minimum width | CSS |
|--------|---------------|-----|
| `sm` | 40rem (640px) | `@media (width >= 40rem) { ... }` |
| `md` | 48rem (768px) | `@media (width >= 48rem) { ... }` |
| `lg` | 64rem (1024px) | `@media (width >= 64rem) { ... }` |
| `xl` | 80rem (1280px) | `@media (width >= 80rem) { ... }` |
| `2xl` | 96rem (1536px) | `@media (width >= 96rem) { ... }` |

## Example: Responsive Component

```html
<div class="mx-auto max-w-md overflow-hidden rounded-xl bg-white shadow-md md:max-w-2xl">
  <div class="md:flex">
    <div class="md:shrink-0">
      <img
        class="h-48 w-full object-cover md:h-full md:w-48"
        src="/img/building.jpg"
        alt="Modern building architecture"
      />
    </div>
    <div class="p-8">
      <div class="text-sm font-semibold tracking-wide text-indigo-500 uppercase">Company retreats</div>
      <a href="#" class="mt-1 block text-lg leading-tight font-medium text-black hover:underline">
        Incredible accommodation for your team
      </a>
      <p class="mt-2 text-gray-500">
        Looking to take your team away on a retreat to enjoy awesome food and take in some sunshine? We have a list of places to do just that.
      </p>
    </div>
  </div>
</div>
```

## Mobile-First Approach

Tailwind uses a mobile-first breakpoint system. Unprefixed utilities apply to all screen sizes, while prefixed utilities apply at that breakpoint and above.

**Correct:** Use unprefixed utilities for mobile:
```html
<div class="text-center sm:text-left"></div>
```

**Incorrect:** Don't use `sm:` for mobile targeting:
```html
<!-- This only centers text on 640px+ screens -->
<div class="sm:text-center"></div>
```

## Targeting Breakpoint Ranges

Stack a responsive variant with a `max-*` variant to limit styles to a specific range:

```html
<div class="md:max-xl:flex"><!-- ... --></div>
```

Available `max-*` variants:

| Variant | Media query |
|---------|-------------|
| `max-sm` | `@media (width < 40rem) { ... }` |
| `max-md` | `@media (width < 48rem) { ... }` |
| `max-lg` | `@media (width < 64rem) { ... }` |
| `max-xl` | `@media (width < 80rem) { ... }` |
| `max-2xl` | `@media (width < 96rem) { ... }` |

To target a single breakpoint:
```html
<div class="md:max-lg:flex"><!-- ... --></div>
```

## Custom Breakpoints

### Customize theme variables:

```css
@import "tailwindcss";

@theme {
  --breakpoint-xs: 30rem;
  --breakpoint-2xl: 100rem;
  --breakpoint-3xl: 120rem;
}
```

Then use in markup:
```html
<div class="grid xs:grid-cols-2 3xl:grid-cols-6"><!-- ... --></div>
```

### Remove default breakpoints:

```css
@import "tailwindcss";

@theme {
  --breakpoint-2xl: initial;
}
```

Or reset all and define custom ones:
```css
@import "tailwindcss";

@theme {
  --breakpoint-*: initial;
  --breakpoint-tablet: 40rem;
  --breakpoint-laptop: 64rem;
  --breakpoint-desktop: 80rem;
}
```

### Arbitrary values:

```html
<div class="max-[600px]:bg-sky-300 min-[320px]:text-center"><!-- ... --></div>
```

## Container Queries

Container queries let you style elements based on a parent container's size rather than the viewport. **Built-in to v4 — no plugin needed.**

### Basic usage:

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row">
    <!-- ... -->
  </div>
</div>
```

### Max-width queries:

```html
<div class="@container">
  <div class="flex flex-row @max-md:flex-col">
    <!-- ... -->
  </div>
</div>
```

### Targeting ranges:

```html
<div class="@container">
  <div class="flex flex-row @sm:@max-md:flex-col">
    <!-- ... -->
  </div>
</div>
```

### Named containers:

```html
<div class="@container/main">
  <!-- ... -->
  <div class="flex flex-row @sm/main:flex-col">
    <!-- ... -->
  </div>
</div>
```

### Custom container sizes:

```css
@import "tailwindcss";

@theme {
  --container-8xl: 96rem;
}
```

```html
<div class="@container">
  <div class="flex flex-col @8xl:flex-row"><!-- ... --></div>
</div>
```

### Arbitrary container values:

```html
<div class="@container">
  <div class="flex flex-col @min-[475px]:flex-row"><!-- ... --></div>
</div>
```

### Container query units:

```html
<div class="@container">
  <div class="w-[50cqw]"><!-- ... --></div>
</div>
```

## Default Container Sizes

| Variant | Minimum width | CSS |
|---------|---------------|-----|
| `@3xs` | 16rem (256px) | `@container (width >= 16rem) { … }` |
| `@2xs` | 18rem (288px) | `@container (width >= 18rem) { … }` |
| `@xs` | 20rem (320px) | `@container (width >= 20rem) { … }` |
| `@sm` | 24rem (384px) | `@container (width >= 24rem) { … }` |
| `@md` | 28rem (448px) | `@container (width >= 28rem) { … }` |
| `@lg` | 32rem (512px) | `@container (width >= 32rem) { … }` |
| `@xl` | 36rem (576px) | `@container (width >= 36rem) { … }` |
| `@2xl` | 42rem (672px) | `@container (width >= 42rem) { … }` |
| `@3xl` | 48rem (768px) | `@container (width >= 48rem) { … }` |
| `@4xl` | 56rem (896px) | `@container (width >= 56rem) { … }` |
| `@5xl` | 64rem (1024px) | `@container (width >= 64rem) { … }` |
| `@6xl` | 72rem (1152px) | `@container (width >= 72rem) { … }` |
| `@7xl` | 80rem (1280px) | `@container (width >= 80rem) { … }` |
