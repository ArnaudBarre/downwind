# downwind [![npm](https://img.shields.io/npm/v/@arnaud-barre/downwind)](https://www.npmjs.com/package/@arnaud-barre/downwind)

A PostCSS-less implementation of Tailwind based on [Lightning CSS](https://github.com/parcel-bundler/lightningcss) with an API optimized for dev server like [Vite](https://github.com/vitejs/vite).

Inspired by [UnoCSS](https://github.com/unocss/unocss).

## Usage with [Vite](https://vitejs.dev/)

```ts
// vite.config.ts
import { downwind } from "@arnaud-barre/downwind/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [downwind()] });
```

Add `import "virtual:@downwind/base.css";` and `import "virtual:@downwind/utils.css";` to your code.

[Like unocss](https://github.com/unocss/unocss/tree/main/packages/vite#design-in-devtools), you can also add `import "virtual:@downwind/devtools";` to get autocomplete and on-demand CSS in the browser. The same warning apply:

> ⚠️ Please use it with caution, under the hood we use [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to detect the class changes. Which means not only your manual changes but also the changes made by your scripts will be detected and included in the stylesheet. This could cause some misalignment between dev and the production build when you add dynamic classes based on some logic in script tags. We recommended adding your dynamic parts to the safelist or setup UI regression tests for your production build if possible.

To use nesting, install [postcss-nested](https://github.com/postcss/postcss-nested) and add it to the postcss config:

```js
// postcss.config.js
module.exports = {
  plugins: {
    "postcss-nested": {},
  },
};
```

## Usage with [esbuild](https://github.com/evanw/esbuild)

```ts
import { downwind } from "@arnaud-barre/downwind/esbuild";
import { build } from "esbuild";

await build({
  bundle: true,
  // entryPoints, sourcemap, minify, outdir, target, ...
  plugins: [downwind()],
});
```

Add `import "virtual:@downwind/base.css";` and `import "virtual:@downwind/utils.css";` to your code.

Nesting and CSS modules are directly supported via Lightning CSS.

## Scanned extension

For almost all UI application, the CSS classes are always located in the same file extension (`tsx`, `vue`, `svelte`).

By default, downwind will only scan the file with matches the `scannedExtension` (default to `tsx`).

It can be changed in both plugins:

```ts
// vite
plugins: [downwind({ scannedExtension: "vue" })];
// esbuild
plugins: [downwind({ scannedExtension: "vue", scanRegex: /\.(vue|ts)$/ })];
```

For cases where you need any other file to be scanned, include the `@downwind-scan` pragma in any comment of the file.

## Configuration

This is optional and can be used to customize the default theme, disable core rules, add new rules, shortcuts or a safelist.

The file should be named `downwind.config.ts`.

```ts
import { DownwindConfig } from "@arnaud-barre/downwind";

export const config: DownwindConfig = {
  // ...
};
```

This can also be computed asynchronously:

```ts
export const config: DownwindConfig = async () => {
  return {
    // ...
  };
};
```

## Differences with Tailwind

### Components

Downwind doesn't have the notion of components, but custom rules can be injected before core rules by using `injectFirst: true`.

Shortcuts from [Windi CSS](https://windicss.org/features/shortcuts.html#shortcuts) solves most the needs and can be added to the configuration:

```ts
// downwind.config.ts
import { DownwindConfig } from "@arnaud-barre/downwind";

export const config: DownwindConfig = {
  shortcuts: {
    "btn": "py-2 px-4 font-semibold rounded-lg shadow-md",
    "btn-green": "text-white bg-green-500 hover:bg-green-700",
  },
};
```

### Arbitrary values

The implementation would work most of the time, but some shortcuts have been made to keep the implementation lean and fast:

- `backgroundImage`, `backgroundPosition` and `fontFamily` are not supported
- For prefix with collision (divide, border, bg, stroke, text, decoration, outline, ring, ring-offset), if the value doesn't match a CSS color (hex, rgb\[a], hsl\[a]) it's interpreted as the "size" version. Using data types is not supported
- Underscore are always mapped to space
- Values with quotes are not possible (by design for fast scanning)
- The theme function is not supported

[Arbitrary properties](https://tailwindcss.com/docs/adding-custom-styles#arbitrary-properties) can be used to bypass some edge cases.

### Theme colors

The color palette is flat, so colors should be defined like: `"blue-300": "#93c5fd", "blue-400": "#60a5fa"` instead of `blue: { 300: "#93c5fd", 400: "#60a5fa" }`

### Dark mode

Only the `class` strategy is supported.

### Plugins

Tailwind plugins are incompatible, but can probably be re-written using Downwind rules. Go to the types definition to get more information.

For simple utilities, you can use `staticRules`:

```ts
// downwind.config.ts
import { DownwindConfig, staticRules } from "@arnaud-barre/downwind";

export const config: DownwindConfig = {
  rules: [
    ...staticRules({
      "overflow-x-auto": { "overflow-x": "auto" },
      "overflow-y-auto": { "overflow-y": "auto" },
    }),
  ],
};
```

### Dynamic variants

`supports-*` is supported.

`max-<screen>` is supported when the screens config is a basic `min-width` only. No sorting is done.

It means `min-*`, `data-*`, `aria-*`, `group-*`, `peer-*` are **not** supported.

Punctual need usage can be accomplished using arbitrary variants: `[@media(min-width:900px)]:block`

Variants modifier (ex. `group/sidebar`) are not supported either. The few cases were there are needed can also be covered with arbitrary variants:
`group-hover/sidebar:opacity-75 group-hover/navitem:bg-black/75` -> `[.sidebar:hover_&]:opacity-75 group-hover:bg-black/75`

### Variants

- `marker` and `selection` variants don't apply on children
- `visited` variant doesn't remove opacity modifiers

### BoxShadow and ring utilities

Both rely on box-shadow to work. The current implementation is way simpler than the Tailwind one, so both utilities can't be used at the same time.

For colored box shadows, you need to use this config format:

```ts
"md": {
  value: "0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color)",
  defaultColor: "rgb(0 0 0 / 0.1)",
}
```

### Flex utility

`display: flex` is automatically included in some cases:

- `flex flex-col` -> `flex-col`
- `flex flex-row-reverse` -> `flex-row-reverse`
- `flex flex-col-reverse` -> `flex-col-reverse`
- `flex flex-wrap` -> `flex-wrap`
- `flex flex-wrap-reverse` -> `flex-wrap-reverse`

### Space utility

Can be overridden by margin utility and doesn't work for flex-reverse. I highly recommend migrating to [flex gap](https://caniuse.com/flexbox-gap).

### Inset utility

Angle utility are available ex: `insert-tr-2`

### Divide utility

Simpler implementation that makes divide and divide-reverse independent. Naming is updated to avoid an implementation edge case.
`divide-y divide-y-reverse` -> `divide-reverse-y`

### VerticalAlign utility

Can be customized via theme. Mostly useful to allow arbitrary values without a specific edge case.

### Cursor utility

The possible values are not configurable via theme.

### [Line clamp utility](https://tailwindcss.com/docs/plugins#line-clamp)

Included by default

### Theme function

To avoid parsing errors in WebStorm, double quotes are required. And because [the palette color is flat](#theme-colors), any configuration value is accessed via `theme("key.value")`:

- `theme(borderRadius.lg)` -> `theme("borderRadius.lg")`
- `theme(colors.blue.500 / 75%)` -> `theme("colors.blue-500 / 75%")`
- `theme(spacing[2.5])` -> `theme("spacing.2.5")`

### Almost exhaustive list of non-supported features

- Container queries, but this will probably be added later
- [prefix](https://tailwindcss.com/docs/configuration#prefix), [separator](https://tailwindcss.com/docs/configuration#separator) and [important](https://tailwindcss.com/docs/configuration#important) configuration options
- These deprecated utils: `transform`, `transform-cpu`, `decoration-slice` `decoration-clone`, `filter`, `backdrop-filter`, `blur-0`
- These deprecated colors: `lightBlue`, `warmGray`, `trueGray`, `coolGray`, `blueGray`
- Using multiple group and peer variants (i.e. `group-active:group-hover:bg-blue-200` doesn't work)
- `@tailwind`, `@config` and `@layer` directives
- `@apply` for anything else than utils
- `!important` at the end of `@apply` statement
- Using pre-processor like `Sass` or `less`
- `border-spacing` utility
- Negative utilities when using min/max/clamp
- `rtl` variant
- Multi-range breakpoints & custom media queries in screens
- Sorting of extended screens with default ones
- Object for keyframes definition
- Multiple keyframes in animation
- Letter spacing & font weight in fontSize theme
- Font feature settings in fontFamily theme
- Regular expressions in safelist
