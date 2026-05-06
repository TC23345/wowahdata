# Colors - Core Concepts

> Source: https://tailwindcss.com/docs/colors

Tailwind CSS includes a vast, beautiful color palette out of the box, carefully crafted by expert designers and suitable for a wide range of different design styles.

Every color in the default palette includes 11 steps, with 50 being the lightest, and 950 being the darkest:

- 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950

The entire color palette is available across all color related utilities, including background color, border color, fill, caret color, and many more.

## Working with Colors

### Using Color Utilities

Use color utilities like `bg-white`, `border-pink-300`, and `text-gray-950` to set different color properties of elements in your design:

```html
<div class="flex items-center gap-4 rounded-lg bg-white p-6 shadow-md outline outline-black/5 dark:bg-gray-800">
  <span class="inline-flex shrink-0 rounded-full border border-pink-300 bg-pink-100 p-2 dark:border-pink-300/10 dark:bg-pink-400/10">
    <svg class="size-6 stroke-pink-700 dark:stroke-pink-500"><!-- ... --></svg>
  </span>
  <div>
    <p class="text-gray-700 dark:text-gray-400">
      <span class="font-medium text-gray-950 dark:text-white">Tom Watson</span> mentioned you in
      <span class="font-medium text-gray-950 dark:text-white">Logo redesign</span>
    </p>
    <time class="mt-1 block text-gray-500" datetime="9:37">9:37am</time>
  </div>
</div>
```

Here's a full list of utilities that use your color palette:

| Utility | Description |
|---------|-------------|
| `bg-*` | Sets the background color of an element |
| `text-*` | Sets the text color of an element |
| `decoration-*` | Sets the text decoration color of an element |
| `border-*` | Sets the border color of an element |
| `outline-*` | Sets the outline color of an element |
| `shadow-*` | Sets the color of box shadows |
| `inset-shadow-*` | Sets the color of inset box shadows |
| `ring-*` | Sets the color of ring shadows |
| `inset-ring-*` | Sets the color of inset ring shadows |
| `accent-*` | Sets the accent color of form controls |
| `caret-*` | Sets the caret color in form controls |
| `fill-*` | Sets the fill color of SVG elements |
| `stroke-*` | Sets the stroke color of SVG elements |

### Adjusting Opacity

You can adjust the opacity of a color using syntax like `bg-black/75`, where `75` sets the alpha channel of the color to 75%:

```html
<div>
  <div class="bg-sky-500/10"></div>
  <div class="bg-sky-500/20"></div>
  <div class="bg-sky-500/30"></div>
  <div class="bg-sky-500/40"></div>
  <div class="bg-sky-500/50"></div>
  <div class="bg-sky-500/60"></div>
  <div class="bg-sky-500/70"></div>
  <div class="bg-sky-500/80"></div>
  <div class="bg-sky-500/90"></div>
  <div class="bg-sky-500/100"></div>
</div>
```

This syntax also supports arbitrary values and the CSS variable shorthand:

```html
<div class="bg-pink-500/[71.37%]"><!-- ... --></div>
<div class="bg-cyan-400/(--my-alpha-value)"><!-- ... --></div>
```

### Targeting Dark Mode

Use the `dark` variant to write classes like `dark:bg-gray-800` that only apply a color when dark mode is active:

```html
<div class="bg-white dark:bg-gray-800 rounded-lg px-6 py-8 ring shadow-xl ring-gray-900/5">
  <div>
    <span class="inline-flex items-center justify-center rounded-md bg-indigo-500 p-2 shadow-lg">
      <svg class="h-6 w-6 stroke-white" ...>
        <!-- ... -->
      </svg>
    </span>
  </div>
  <h3 class="text-gray-900 dark:text-white mt-5 text-base font-medium tracking-tight ">Writes upside-down</h3>
  <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
    The Zero Gravity Pen can be used to write in any orientation, including upside-down. It even works in outer space.
  </p>
</div>
```

### Referencing in CSS

Colors are exposed as CSS variables in the `--color-*` namespace, so you can reference them in CSS with variables like `--color-blue-500` and `--color-pink-700`:

```css
@import "tailwindcss";

@layer components {
  .typography {
    color: var(--color-gray-950);
    a {
      color: var(--color-blue-500);
      &:hover {
        color: var(--color-blue-800);
      }
    }
  }
}
```

You can also use these as arbitrary values in utility classes:

```html
<div class="bg-[light-dark(var(--color-white),var(--color-gray-950))]">
  <!-- ... -->
</div>
```

To quickly adjust the opacity of a color when referencing it as a variable in CSS, Tailwind includes a special `--alpha()` function:

```css
@import "tailwindcss";

@layer components {
  .DocSearch-Hit--Result {
    background-color: --alpha(var(--color-gray-950) / 10%);
  }
}
```

## Customizing Your Colors

Use `@theme` to add custom colors to your project under the `--color-*` theme namespace:

```css
@import "tailwindcss";

@theme {
  --color-midnight: #121063;
  --color-tahiti: #3ab7bf;
  --color-bermuda: #78dcca;
}
```

Now utilities like `bg-midnight`, `text-tahiti`, and `fill-bermuda` will be available in your project in addition to the default colors.

### Overriding Default Colors

Override any of the default colors by defining new theme variables with the same name:

```css
@import "tailwindcss";

@theme {
  --color-gray-50: oklch(0.984 0.003 247.858);
  --color-gray-100: oklch(0.968 0.007 247.896);
  --color-gray-200: oklch(0.929 0.013 255.508);
  --color-gray-300: oklch(0.869 0.022 252.894);
  --color-gray-400: oklch(0.704 0.04 256.788);
  --color-gray-500: oklch(0.554 0.046 257.417);
  --color-gray-600: oklch(0.446 0.043 257.281);
  --color-gray-700: oklch(0.372 0.044 257.287);
  --color-gray-800: oklch(0.279 0.041 260.031);
  --color-gray-900: oklch(0.208 0.042 265.755);
  --color-gray-950: oklch(0.129 0.042 264.695);
}
```

### Disabling Default Colors

Disable any default color by setting the theme namespace for that color to `initial`:

```css
@import "tailwindcss";

@theme {
  --color-lime-*: initial;
  --color-fuchsia-*: initial;
}
```

This is especially useful for removing the corresponding CSS variables from your output for colors you don't intend to use.

### Using a Custom Palette

Use `--color-*: initial` to completely disable all of the default colors and define your own custom color palette:

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

### Referencing Other Variables

Use `@theme inline` when defining colors that reference other colors:

```css
@import "tailwindcss";

:root {
  --acme-canvas-color: oklch(0.967 0.003 264.542);
}

[data-theme="dark"] {
  --acme-canvas-color: oklch(0.21 0.034 264.665);
}

@theme inline {
  --color-canvas: var(--acme-canvas-color);
}
```

## Default Color Palette Reference

Here's a complete list of the default colors and their values (sample shown — see https://tailwindcss.com/docs/colors for the complete list):

```css
@theme {
  --color-red-50: oklch(97.1% 0.013 17.38);
  --color-red-100: oklch(93.6% 0.032 17.717);
  --color-red-200: oklch(88.5% 0.062 18.334);
  --color-red-300: oklch(80.8% 0.114 19.571);
  --color-red-400: oklch(70.4% 0.191 22.216);
  --color-red-500: oklch(63.7% 0.237 25.331);
  --color-red-600: oklch(57.7% 0.245 27.325);
  --color-red-700: oklch(50.5% 0.213 27.518);
  --color-red-800: oklch(44.4% 0.177 26.899);
  --color-red-900: oklch(39.6% 0.141 25.723);
  --color-red-950: oklch(25.8% 0.092 26.042);
  /* ... additional color scales (orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, slate, gray, zinc, neutral, stone, mauve, olive, mist, taupe) ... */
  --color-black: #000;
  --color-white: #fff;
}
```
