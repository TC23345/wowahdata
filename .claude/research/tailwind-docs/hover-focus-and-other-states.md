# Hover, Focus, and Other States

> Source: https://tailwindcss.com/docs/hover-focus-and-other-states

Using utilities to style elements on hover, focus, and more.

Every utility class in Tailwind can be applied *conditionally* by adding a variant to the beginning of the class name that describes the condition you want to target.

For example, to apply the `bg-sky-700` class on hover, use the `hover:bg-sky-700` class:

```html
<button class="bg-sky-500 hover:bg-sky-700 ...">Save changes</button>
```

## How does this compare to traditional CSS?

When writing CSS the traditional way, a single class name would do different things based on the current state:

```css
.btn-primary {
  background-color: #0ea5e9;
}
.btn-primary:hover {
  background-color: #0369a1;
}
```

In Tailwind, rather than adding the styles for a hover state to an existing class, you add another class to the element that *only* does something on hover:

```css
.bg-sky-500 {
  background-color: #0ea5e9;
}
.hover\:bg-sky-700:hover {
  background-color: #0369a1;
}
```

Notice how `hover:bg-sky-700` *only* defines styles for the `:hover` state? It does nothing by default, but as soon as you hover over an element with that class, the background color will change to `sky-700`.

Tailwind includes variants for:

- **Pseudo-classes**, like `:hover`, `:focus`, `:first-child`, and `:required`
- **Pseudo-elements**, like `::before`, `::after`, `::placeholder`, and `::selection`
- **Media and feature queries**, like responsive breakpoints, dark mode, and `prefers-reduced-motion`
- **Attribute selectors**, like `[dir="rtl"]` and `[open]`
- **Child selectors**, like `& > *` and `& *`

These variants can even be stacked to target more specific situations:

```html
<button class="dark:md:hover:bg-fuchsia-600 ...">Save changes</button>
```

## Pseudo-classes

### :hover, :focus, and :active

```html
<button class="bg-violet-500 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 ...">
  Save changes
</button>
```

### :first, :last, :odd, and :even

```html
<ul role="list">
  {#each people as person}
    <li class="flex py-4 first:pt-0 last:pb-0">
      <!-- ... -->
    </li>
  {/each}
</ul>
```

```html
<table>
  <tbody>
    {#each people as person}
      <tr class="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900/50 dark:even:bg-gray-950">
        <!-- ... -->
      </tr>
    {/each}
  </tbody>
</table>
```

Use the `nth-*` and `nth-last-*` variants to style children based on their position:

```html
<div class="nth-3:underline">…</div>
<div class="nth-last-5:underline">…</div>
<div class="nth-of-type-4:underline">…</div>
<div class="nth-last-of-type-6:underline">…</div>
```

### :required and :disabled

```html
<input
  type="text"
  value="tbone"
  disabled
  class="invalid:border-pink-500 invalid:text-pink-600 focus:border-sky-500 focus:outline focus:outline-sky-500 focus:invalid:border-pink-500 focus:invalid:outline-pink-500 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none ..."
/>
```

### :has()

```html
<label class="has-checked:bg-indigo-50 has-checked:text-indigo-900 has-checked:ring-indigo-200 ...">
  <!-- ... -->
  <input type="radio" class="checked:border-indigo-500 ..." />
</label>
```

#### Styling based on the descendants of a group

```html
<div class="group ...">
  <img src="..." />
  <h4>Spencer Sharp</h4>
  <svg class="hidden group-has-[a]:block ..."><!-- ... --></svg>
  <p>Product Designer at <a href="...">planeteria.tech</a></p>
</div>
```

#### Styling based on the descendants of a peer

```html
<div>
  <label class="peer ...">
    <input type="checkbox" name="todo[1]" checked />
    Create a to do list
  </label>
  <svg class="peer-has-checked:hidden ..."><!-- ... --></svg>
</div>
```

### :not()

```html
<button class="bg-indigo-600 hover:not-focus:bg-indigo-700">
  <!-- ... -->
</button>
```

```html
<div class="not-supports-[display:grid]:flex">
  <!-- ... -->
</div>
```

### Styling based on parent state

```html
<a href="#" class="group ...">
  <div>
    <svg class="stroke-sky-500 group-hover:stroke-white ..." fill="none" viewBox="0 0 24 24">
      <!-- ... -->
    </svg>
    <h3 class="text-gray-900 group-hover:text-white ...">New project</h3>
  </div>
  <p class="text-gray-500 group-hover:text-white ...">Create a new project from a variety of starting templates.</p>
</a>
```

#### Differentiating nested groups

```html
<ul role="list">
  {#each people as person}
    <li class="group/item ...">
      <!-- ... -->
      <a class="group/edit invisible group-hover/item:visible ..." href="tel:{person.phone}">
        <span class="group-hover/edit:text-gray-700 ...">Call</span>
      </a>
    </li>
  {/each}
</ul>
```

#### Arbitrary groups

```html
<div class="group is-published">
  <div class="hidden group-[.is-published]:block">
    Published
  </div>
</div>
```

#### Implicit groups

The `in-*` variant works similarly to `group` except you don't need to add `group` to the parent:

```html
<div tabindex="0">
  <div class="opacity-50 in-focus:opacity-100">
    <!-- ... -->
  </div>
</div>
```

### Styling based on sibling state

```html
<form>
  <label class="block">
    <span class="...">Email</span>
    <input type="email" class="peer ..." />
    <p class="invisible peer-invalid:visible ...">Please provide a valid email address.</p>
  </label>
</form>
```

The `peer` marker can only be used on *previous* siblings because of how the CSS subsequent-sibling combinator works.

## Pseudo-elements

### ::before and ::after

```html
<label>
  <span class="text-gray-700 after:ml-0.5 after:text-red-500 after:content-['*'] ...">Email</span>
  <input type="email" name="email" class="..." placeholder="you@example.com" />
</label>
```

When using these variants, Tailwind will automatically add `content: ''` by default unless you specify a different value.

### ::placeholder

```html
<input
  class="placeholder:text-gray-500 placeholder:italic ..."
  placeholder="Search for anything..."
  type="text"
  name="search"
/>
```

### ::file

```html
<input
  type="file"
  class="file:mr-4 file:rounded-full file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-100 ..."
/>
```

### ::marker

```html
<ul role="list" class="list-disc marker:text-sky-400 ...">
  <li>5 cups chopped Porcini mushrooms</li>
  <li>1/2 cup of olive oil</li>
  <li>3lb of celery</li>
</ul>
```

### ::selection

```html
<div class="selection:bg-fuchsia-300 selection:text-fuchsia-900">
  <p>...</p>
</div>
```

### ::first-line and ::first-letter

```html
<div class="text-gray-700">
  <p class="first-letter:float-left first-letter:mr-3 first-letter:text-7xl first-letter:font-bold first-letter:text-gray-900 first-line:tracking-widest first-line:uppercase">
    Well, let me tell you something, funny boy. Y'know that little stamp, the one that says "New York Public Library"?
  </p>
</div>
```

### ::backdrop

```html
<dialog class="backdrop:bg-gray-50">
  <form method="dialog">
    <!-- ... -->
  </form>
</dialog>
```

## Media and feature queries

### Responsive breakpoints

```html
<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
  <!-- ... -->
</div>
```

To style an element based on the width of a parent element instead of the viewport, use variants like `@md` and `@lg`:

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row">
    <!-- ... -->
  </div>
</div>
```

### prefers-color-scheme

```html
<div class="bg-white dark:bg-gray-900 ...">
  <!-- ... -->
</div>
```

### prefers-reduced-motion

```html
<button type="button" class="bg-indigo-500 ..." disabled>
  <svg class="animate-spin motion-reduce:hidden ..." viewBox="0 0 24 24"><!-- ... --></svg>
  Processing...
</button>
```

```html
<button class="motion-safe:transition motion-safe:hover:-translate-x-0.5 ...">Save changes</button>
```

### prefers-contrast

```html
<label class="block">
  <span class="block text-sm font-medium text-gray-700">Social Security Number</span>
  <input class="border-gray-200 placeholder-gray-400 contrast-more:border-gray-400 contrast-more:placeholder-gray-500 ..." />
</label>
```

### forced-colors

```html
<label>
  <input type="radio" class="appearance-none forced-colors:appearance-auto" />
  <p class="hidden forced-colors:block">Cyan</p>
  <div class="bg-cyan-200 forced-colors:hidden ..."></div>
</label>
```

### inverted-colors

```html
<div class="shadow-xl inverted-colors:shadow-none ...">
  <!-- ... -->
</div>
```

### pointer and any-pointer

```html
<div class="mt-4 grid grid-cols-6 gap-2 pointer-coarse:mt-6 pointer-coarse:grid-cols-3 pointer-coarse:gap-4">
  <!-- ... -->
</div>
```

### orientation

```html
<div>
  <div class="portrait:hidden">…</div>
  <div class="landscape:hidden">…</div>
</div>
```

### scripting

```html
<div class="hidden noscript:block">
  <p>This experience requires JavaScript to function. Please enable JavaScript in your browser settings.</p>
</div>
```

### print

```html
<div>
  <article class="print:hidden">…</article>
  <div class="hidden print:block">…</div>
</div>
```

### @supports

```html
<div class="flex supports-[display:grid]:grid ...">
  <!-- ... -->
</div>
```

```html
<div class="bg-black/75 supports-backdrop-filter:bg-black/25 supports-backdrop-filter:backdrop-blur ...">
  <!-- ... -->
</div>
```

```html
<div class="not-supports-[display:grid]:flex">
  <!-- ... -->
</div>
```

### @starting-style

```html
<div>
  <button popovertarget="my-popover">Check for updates</button>
  <div popover id="my-popover" class="opacity-0 starting:open:opacity-0 ...">
    <!-- ... -->
  </div>
</div>
```

## Attribute selectors

### ARIA states

```html
<div aria-checked="true" class="bg-gray-600 aria-checked:bg-sky-700">
  <!-- ... -->
</div>
```

Tailwind includes variants for common boolean ARIA attributes:

| Variant | CSS |
|---------|-----|
| `aria-busy` | `&[aria-busy="true"]` |
| `aria-checked` | `&[aria-checked="true"]` |
| `aria-disabled` | `&[aria-disabled="true"]` |
| `aria-expanded` | `&[aria-expanded="true"]` |
| `aria-hidden` | `&[aria-hidden="true"]` |
| `aria-pressed` | `&[aria-pressed="true"]` |
| `aria-readonly` | `&[aria-readonly="true"]` |
| `aria-required` | `&[aria-required="true"]` |
| `aria-selected` | `&[aria-selected="true"]` |

For more complex ARIA attributes, use square brackets:

```html
<th aria-sort="ascending" class="aria-[sort=ascending]:bg-[url('/img/down-arrow.svg')] aria-[sort=descending]:bg-[url('/img/up-arrow.svg')]">
  Invoice #
</th>
```

### Data attributes

To check if a data attribute exists:

```html
<div data-active class="border border-gray-300 data-active:border-purple-500">
  <!-- ... -->
</div>
```

To check for a specific value:

```html
<div data-size="large" class="data-[size=large]:p-8">
  <!-- ... -->
</div>
```

Or configure shortcuts:

```css
@import "tailwindcss";
@custom-variant data-checked (&[data-ui~="checked"]);
```

```html
<div data-ui="checked active" class="data-checked:underline">
  <!-- ... -->
</div>
```

### RTL support

```html
<div class="group flex items-center">
  <img class="h-12 w-12 shrink-0 rounded-full" src="..." alt="" />
  <div class="ltr:ml-3 rtl:mr-3">
    <!-- ... -->
  </div>
</div>
```

### Open/closed state

```html
<details class="border border-transparent open:border-black/10 open:bg-gray-100 ..." open>
  <summary class="text-sm leading-6 font-semibold text-gray-900 select-none">Why do they call it Ovaltine?</summary>
  <div class="mt-3 text-sm leading-6 text-gray-600">
    <p>The mug is round. The jar is round. They should call it Roundtine.</p>
  </div>
</details>
```

This variant also targets `:popover-open`.

### Styling inert elements

```html
<form>
  <fieldset inert class="inert:opacity-50">
    <!-- ... -->
  </fieldset>
</form>
```

## Child selectors

### Styling direct children

Use the `*` variant to style direct children:

```html
<ul class="*:rounded-full *:border *:border-sky-100 *:bg-sky-50 *:px-2 *:py-0.5 ...">
  <li>Sales</li>
  <li>Marketing</li>
  <li>SEO</li>
</ul>
```

### Styling all descendants

Use the `**` variant to style all descendants:

```html
<ul class="**:data-avatar:size-12 **:data-avatar:rounded-full ...">
  {#each items as item}
    <li>
      <img src={item.src} data-avatar />
      <p>{item.name}</p>
    </li>
  {/each}
</ul>
```

## Custom variants

### Using arbitrary variants

```html
<ul role="list">
  {#each items as item}
    <li class="[&.is-dragging]:cursor-grabbing">{item}</li>
  {/each}
</ul>
```

Use underscores for spaces in your selector:

```html
<div class="[&_p]:mt-4">
  <p>Lorem ipsum...</p>
</div>
```

Use at-rules like `@media` or `@supports`:

```html
<div class="flex [@supports(display:grid)]:grid">
  <!-- ... -->
</div>
```

### Registering a custom variant

```css
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

```html
<html data-theme="midnight">
  <button class="theme-midnight:bg-black ..."></button>
</html>
```
