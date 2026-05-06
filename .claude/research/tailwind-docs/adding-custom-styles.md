# Adding Custom Styles - Tailwind CSS

> Source: https://tailwindcss.com/docs/adding-custom-styles

Best practices for adding your own custom styles in Tailwind projects.

Tailwind has been designed from the ground up to be extensible and customizable, so that no matter what you're building you never feel like you're fighting the framework.

## Customizing Your Theme

If you want to change things like your color palette, spacing scale, typography scale, or breakpoints, add your customizations using the `@theme` directive in your CSS:

```css
@theme {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 120rem;
  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}
```

## Using Arbitrary Values

Use square bracket notation to generate classes on the fly with any arbitrary value:

```html
<div class="top-[117px]">
  <!-- ... -->
</div>
```

Combine with interactive and responsive modifiers:

```html
<div class="top-[117px] lg:top-[344px]">
  <!-- ... -->
</div>
```

Works for colors, font sizes, content, and more:

```html
<div class="bg-[#bada55] text-[22px] before:content-['Festivus']">
  <!-- ... -->
</div>
```

Reference CSS variables with custom property syntax:

```html
<div class="fill-(--my-brand-color) ...">
  <!-- ... -->
</div>
```

### Arbitrary Properties

Use square bracket notation for CSS properties Tailwind doesn't include:

```html
<div class="[mask-type:luminance]">
  <!-- ... -->
</div>
```

Works with modifiers:

```html
<div class="[mask-type:luminance] hover:[mask-type:alpha]">
  <!-- ... -->
</div>
```

### Arbitrary Variants

Arbitrary variants allow on-the-fly selector modification:

```html
<ul role="list">
  {#each items as item}
  <li class="lg:[&:nth-child(-n+3)]:hover:underline">{item}</li>
  {/each}
</ul>
```

### Handling Whitespace

Use underscores (`_`) for spaces, which Tailwind converts automatically:

```html
<div class="grid grid-cols-[1fr_500px_2fr]">
  <!-- ... -->
</div>
```

Tailwind preserves underscores in URLs:

```html
<div class="bg-[url('/what_a_rush.png')]">
  <!-- ... -->
</div>
```

Escape underscores with backslash when ambiguous:

```html
<div class="before:content-['hello\_world']">
  <!-- ... -->
</div>
```

Or use `String.raw()` in JSX:

```jsx
<div className={String.raw`before:content-['hello\_world']`}>
  <!-- ... -->
</div>
```

### Resolving Ambiguities

Tailwind automatically handles ambiguity based on values:

```html
<!-- Font-size utility -->
<div class="text-[22px]">...</div>

<!-- Color utility -->
<div class="text-[#bada55]">...</div>
```

For CSS variables, use type hints:

```html
<!-- Font-size utility -->
<div class="text-(length:--my-var)">...</div>

<!-- Color utility -->
<div class="text-(color:--my-var)">...</div>
```

## Using Custom CSS

Write plain CSS when needed:

```css
@import "tailwindcss";

.my-custom-style {
  /* ... */
}
```

### Adding Base Styles

Add classes to `html` or `body` for defaults:

```html
<!doctype html>
<html lang="en" class="bg-gray-100 font-serif text-gray-900">
  <!-- ... -->
</html>
```

Or use the `@layer` directive for element defaults:

```css
@layer base {
  h1 {
    font-size: var(--text-2xl);
  }
  h2 {
    font-size: var(--text-xl);
  }
}
```

### Adding Component Classes

Use the `components` layer for reusable component-like classes:

```css
@layer components {
  .card {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    padding: --spacing(6);
    box-shadow: var(--shadow-xl);
  }
}
```

Override with utilities when needed:

```html
<!-- Card with square corners -->
<div class="card rounded-none">
  <!-- ... -->
</div>
```

Also use for third-party component styles:

```css
@layer components {
  .select2-dropdown {
    /* ... */
  }
}
```

### Using Variants

Apply Tailwind variants in custom CSS:

```css
.my-element {
  background: white;
  @variant dark {
    background: black;
  }
}
```

Compiled CSS:

```css
.my-element {
  background: white;
  @media (prefers-color-scheme: dark) {
    background: black;
  }
}
```

Use nesting for multiple variants:

```css
.my-element {
  background: white;
  @variant dark {
    @variant hover {
      background: black;
    }
  }
}
```

## Adding Custom Utilities

### Simple Utilities

Use the `@utility` directive:

```css
@utility content-auto {
  content-visibility: auto;
}
```

Use in HTML with variant support:

```html
<div class="content-auto">
  <!-- ... -->
</div>

<div class="hover:content-auto">
  <!-- ... -->
</div>
```

### Complex Utilities

Use nesting for complex utilities:

```css
@utility scrollbar-hidden {
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### Functional Utilities

Register functional utilities with arguments:

```css
@utility tab-* {
  tab-size: --value(--tab-size-*);
}
```

#### Matching Theme Values

```css
@theme {
  --tab-size-2: 2;
  --tab-size-4: 4;
  --tab-size-github: 8;
}

@utility tab-* {
  tab-size: --value(--tab-size-*);
}
```

Matches: `tab-2`, `tab-4`, `tab-github`

#### Bare Values

```css
@utility tab-* {
  tab-size: --value(integer);
}
```

Matches: `tab-1`, `tab-76`

Available types: `number`, `integer`, `ratio`, `percentage`

#### Literal Values

```css
@utility tab-* {
  tab-size: --value("inherit", "initial", "unset");
}
```

Matches: `tab-inherit`, `tab-initial`, `tab-unset`

#### Arbitrary Values

```css
@utility tab-* {
  tab-size: --value([integer]);
}
```

Matches: `tab-[1]`, `tab-[76]`

#### Supporting Multiple Value Types

```css
@utility opacity-* {
  opacity: --value([percentage]);
  opacity: calc(--value(integer) * 1%);
  opacity: --value(--opacity-*);
}
```

#### Negative Values

```css
@utility inset-* {
  inset: --spacing(--value(integer));
  inset: --value([percentage], [length]);
}

@utility -inset-* {
  inset: --spacing(--value(integer) * -1);
  inset: calc(--value([percentage], [length]) * -1);
}
```

#### Modifiers

```css
@utility text-* {
  font-size: --value(--text-*, [length]);
  line-height: --modifier(--leading-*, [length], [*]);
}
```

#### Fractions

```css
@utility aspect-* {
  aspect-ratio: --value(--aspect-ratio-*, ratio, [ratio]);
}
```

Matches: `aspect-square`, `aspect-3/4`, `aspect-[7/9]`

## Adding Custom Variants

Use the `@custom-variant` directive:

```css
@custom-variant theme-midnight {
  &:where([data-theme="midnight"] *) {
    @slot;
  }
}
```

Use in HTML:

```html
<html data-theme="midnight">
  <button class="theme-midnight:bg-black ..."></button>
</html>
```

Shorthand syntax:

```css
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

Multiple rules with nesting:

```css
@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}
```
