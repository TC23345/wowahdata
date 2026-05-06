# Tailwind CSS Typography Plugin

> Source: https://github.com/tailwindlabs/tailwindcss-typography (the `tailwindcss.com/docs/typography-plugin` URL 307-redirects here)

The official Tailwind CSS Typography plugin provides a set of `prose` classes for adding beautiful typographic defaults to vanilla HTML you don't control, like HTML rendered from Markdown or pulled from a CMS.

## Installation

Install the plugin from npm:

```
npm install -D @tailwindcss/typography
```

Then add the plugin to your main `style.css` file (v4):

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

For Tailwind CSS v3, add the plugin to your `tailwind.config.js` file:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    // ...
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ...
  ],
}
```

## Basic Usage

Use the `prose` classes to add typography styles to any vanilla HTML:

```html
<article class="prose lg:prose-xl">
  <h1>Garlic bread with cheese: What the science tells us</h1>
  <p>
    For years parents have espoused the health benefits of eating garlic bread with cheese to their
    children, with the food earning such an iconic status in our culture that kids will often dress
    up as warm, cheesy loaf for Halloween.
  </p>
  <p>
    But a recent study shows that the celebrated appetizer may be linked to a series of rabies cases
    springing up around the country.
  </p>
  <!-- ... -->
</article>
```

## Choosing a Gray Scale

The plugin includes modifier classes for five gray scales:

| Class | Gray scale |
|-------|-----------|
| `prose-gray` _(default)_ | Gray |
| `prose-slate` | Slate |
| `prose-zinc` | Zinc |
| `prose-neutral` | Neutral |
| `prose-stone` | Stone |

Always include the `prose` class when adding a gray scale modifier:

```html
<article class="prose prose-stone">{{ markdown }}</article>
```

## Applying a Type Scale

Size modifiers adjust the overall size of typography for different contexts:

| Class | Body font size |
|-------|----------------|
| `prose-sm` | 0.875rem _(14px)_ |
| `prose-base` _(default)_ | 1rem _(16px)_ |
| `prose-lg` | 1.125rem _(18px)_ |
| `prose-xl` | 1.25rem _(20px)_ |
| `prose-2xl` | 1.5rem _(24px)_ |

Combine with breakpoint modifiers for responsive typography:

```html
<article class="prose md:prose-lg lg:prose-xl">{{ markdown }}</article>
```

## Dark Mode

Trigger the hand-designed dark mode version with the `prose-invert` class:

```html
<article class="prose dark:prose-invert">{{ markdown }}</article>
```

## Element Modifiers

Customize individual elements directly in HTML:

```html
<article class="prose prose-img:rounded-xl prose-headings:underline prose-a:text-blue-600">
  {{ markdown }}
</article>
```

Available element modifiers include:

`prose-headings`, `prose-lead`, `prose-h1`, `prose-h2`, `prose-h3`, `prose-h4`, `prose-p`, `prose-a`, `prose-blockquote`, `prose-figure`, `prose-figcaption`, `prose-strong`, `prose-em`, `prose-kbd`, `prose-code`, `prose-pre`, `prose-ol`, `prose-ul`, `prose-li`, `prose-dl`, `prose-dt`, `prose-dd`, `prose-table`, `prose-thead`, `prose-tr`, `prose-th`, `prose-td`, `prose-img`, `prose-picture`, `prose-video`, `prose-hr`

## Overriding Max-Width

Override the embedded max-width by adding `max-w-none`:

```html
<div class="grid grid-cols-4">
  <div class="col-span-3">
    <article class="prose max-w-none">{{ markdown }}</article>
  </div>
</div>
```

## Advanced Topics

### Undoing Typography Styles

Use the `not-prose` class to exclude blocks from typography styling:

```html
<article class="prose">
  <h1>My Heading</h1>
  <p>...</p>

  <div class="not-prose">
    <!-- Some example or demo that needs to be prose-free -->
  </div>

  <p>...</p>
</article>
```

### Adding Custom Color Themes

Use a `@utility` directive in your CSS file (v4):

```css
@utility prose-pink {
  --tw-prose-body: var(--color-pink-800);
  --tw-prose-headings: var(--color-pink-900);
  --tw-prose-lead: var(--color-pink-700);
  --tw-prose-links: var(--color-pink-900);
  --tw-prose-bold: var(--color-pink-900);
  --tw-prose-counters: var(--color-pink-600);
  --tw-prose-bullets: var(--color-pink-400);
  --tw-prose-hr: var(--color-pink-300);
  --tw-prose-quotes: var(--color-pink-900);
  --tw-prose-quote-borders: var(--color-pink-300);
  --tw-prose-captions: var(--color-pink-700);
  --tw-prose-code: var(--color-pink-900);
  --tw-prose-pre-code: var(--color-pink-100);
  --tw-prose-pre-bg: var(--color-pink-900);
  --tw-prose-th-borders: var(--color-pink-300);
  --tw-prose-td-borders: var(--color-pink-200);
  --tw-prose-invert-body: var(--color-pink-200);
  --tw-prose-invert-headings: var(--color-white);
  --tw-prose-invert-lead: var(--color-pink-300);
  --tw-prose-invert-links: var(--color-white);
  --tw-prose-invert-bold: var(--color-white);
  --tw-prose-invert-counters: var(--color-pink-400);
  --tw-prose-invert-bullets: var(--color-pink-600);
  --tw-prose-invert-hr: var(--color-pink-700);
  --tw-prose-invert-quotes: var(--color-pink-100);
  --tw-prose-invert-quote-borders: var(--color-pink-700);
  --tw-prose-invert-captions: var(--color-pink-400);
  --tw-prose-invert-code: var(--color-white);
  --tw-prose-invert-pre-code: var(--color-pink-300);
  --tw-prose-invert-pre-bg: rgb(0 0 0 / 50%);
  --tw-prose-invert-th-borders: var(--color-pink-600);
  --tw-prose-invert-td-borders: var(--color-pink-700);
}
```

This is how `prose-steel`, `prose-rust`, etc. work — define a `@utility prose-<name>` block that fills in the `--tw-prose-*` variables from your theme palette.

For Tailwind v3, update the `typography` section in `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      typography: () => ({
        pink: {
          css: {
            '--tw-prose-body': 'var(--color-pink-800)',
            '--tw-prose-headings': 'var(--color-pink-900)',
            // ...all the same vars as above
          },
        },
      }),
    },
  },
}
```

### Changing the Default Class Name

Use the `className` option when registering the plugin:

```css
@import 'tailwindcss';
@plugin "@tailwindcss/typography" {
  className: wysiwyg;
}
```

Now all `prose` class names are replaced with your custom name:

```html
<article class="wysiwyg wysiwyg-slate lg:wysiwyg-xl">
  <h1>My Heading</h1>
  <p>...</p>

  <div class="not-wysiwyg">
    <!-- Some example or demo that needs to be prose-free -->
  </div>

  <p>...</p>
</article>
```

### Customizing the CSS

Use the `@config` directive to customize raw CSS:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@config "./tailwind.config.js";
```

Then create a `tailwind.config.js` with your styles:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: '#333',
            a: {
              color: '#3182ce',
              '&:hover': {
                color: '#2c5282',
              },
            },
          },
        },
      },
    },
  },
}
```
