# downwind [![npm](https://img.shields.io/npm/v/@arnaud-barre/downwind)](https://www.npmjs.com/package/@arnaud-barre/downwind)

A bundler-first & PostCSS-independent implementation of Tailwind.

Inspired by [UnoCSS](https://github.com/unocss/unocss).

## Usage with [Vite](https://vitejs.dev/)

```ts
// vite.config.ts
import { downwind } from "@arnaud-barre/downwind/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [downwind()],
  css: {
    transformer: "lightningcss",
  },
  build: {
    cssMinify: "lightningcss",
  },
});
```

Add `import "virtual:@downwind/base.css";` and `import "virtual:@downwind/utils.css";` to your code.

[Like unocss](https://github.com/unocss/unocss/tree/main/packages/vite#design-in-devtools), you can also add `import "virtual:@downwind/devtools";` to get autocomplete and on-demand CSS in the browser. The same warning apply:

> ⚠️ Please use it with caution, under the hood we use [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to detect the class changes. Which means not only your manual changes but also the changes made by your scripts will be detected and included in the stylesheet. This could cause some misalignment between dev and the production build when you add dynamic classes based on some logic in script tags. We recommended adding your dynamic parts to the safelist or setup UI regression tests for your production build if possible.

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

## Scanned extensions

By default, only `.tsx` files and `.ts` files containing `@downwind-scan` are scanned. This can be changed in both plugins:

```ts
// vite
plugins: [
  downwind({
    shouldScan: (id, code) =>
      id.endsWith(".vue") ||
      (id.endsWith(".ts") && code.includes("@downwind-scan")),
  }),
];
// esbuild
plugins: [
  downwind({
    filter: /\.(vue|ts)$/,
    shouldScan: (path, code) =>
      path.endsWith(".vue") || code.includes("@downwind-scan"),
  }),
];
```

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

Few complex cases are not implemented to keep the implementation lean and fast:

- `backgroundImage`, `backgroundPosition` and `fontFamily` are not supported
- For prefix with collision (divide, border, bg, gradient steps, stroke, text, decoration, outline, ring, ring-offset), if the value doesn't match a CSS color (hex, rgb\[a], hsl\[a]) or a CSS variable it's interpreted as the "size" version. Using data types is not supported
- Underscore are always mapped to space
- The theme function is not supported

[Arbitrary properties](https://tailwindcss.com/docs/adding-custom-styles#arbitrary-properties) can be used to bypass some edge cases.

### Theme colors

The color palette is flat, so colors should be defined like: `"blue-300": "#93c5fd", "blue-400": "#60a5fa"` instead of `blue: { 300: "#93c5fd", 400: "#60a5fa" }`

### Dark mode

Only the `class` strategy is supported with a simple `.dark &` selector rewrite

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

`supports-*`, `min-*`, `max-*`, `has-*`, `(group/peer-)data-*`, `(group/peer-)aria-*` are supported.

`max-<screen>` is supported when the screens config is a basic `min-width` only. No sorting is done.

`group-*`, `peer-*` and variants modifier (ex. `group/sidebar`) are not supported. The few cases were there are needed can be covered with arbitrary variants:
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

### Theme function

To avoid parsing errors in WebStorm, double quotes are required. And because [the palette color is flat](#theme-colors), any configuration value is accessed via `theme("key.value")`:

- `theme(borderRadius.lg)` -> `theme("borderRadius.lg")`
- `theme(colors.blue.500 / 75%)` -> `theme("colors.blue-500 / 75%")`
- `theme(spacing[2.5])` -> `theme("spacing.2.5")`

### Almost exhaustive list of non-supported features

- Container queries, but this will probably be added later
- Adding variants via plugins. Also something useful to support in the future
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
- `rtl` variant & logical properties for inline direction
- Multi-range breakpoints & custom media queries in screens
- Sorting of extended screens with default ones
- Object for keyframes definition
- Multiple keyframes in animation
- Letter spacing & font weight in fontSize theme
- Font feature & variation settings in fontFamily theme
- Regular expressions in safelist

## How it works

When loading the configuration, four maps are generated: one for static variants, one for prefixes of dynamic variants, one for static rules and one for prefixes of arbitrary values.

Then an object with few methods is returned:

```ts
{
  getBase: () => string;
  preTransformCSS: (content: string) => {
    invalidateUtils: boolean;
    code: string;
  };
  scan: (code: string) => boolean /* hasNewUtils */;
  generate: () => string;
}
```

- `getBase` returns the static preflight, identical to Tailwind. Init of CSS variables like `--tw-ring-inset` are included in the "utils", which remove the need for base to be processed with utils.
- `preTransformCSS` is used to replace `@apply`, `@screen` & `theme()` in CSS files. Some utils may depend on CSS variable injected in the header of utils, so `invalidateUtils` can be used during development to send an HMR update or refresh the page.
- `scan` is used to scan some source code. A regex is first use to match candidates and then these candidates are parsed roughly like this:
  - Search for variants (repeat until not match):
    - If the token start `[`, looks for next `]:` and add the content as arbitrary variant. If no `]:`, test if it's an arbitrary value (`[color:red]`).
    - else search `:`
      - if the left part contains `-[`, search for the prefix in the dynamic variant map
      - otherwise lookup the value in the static variant map
  - Test if the remaining token is part of the static rules
  - Search for `-[`
    - if matchs:
      - search for the prefix in the arbitrary values maps, if not bail out
      - search for `]/`
        - if matchs, parse the left as arbitrary value and thr right as modifier
        - else if ends with `]`, parse the left as arbitrary value
    - else search for `/`, parse search for the left in the static rules map and parse the end as a modifier

If the token matches a rule and is new it's added to an internal map structured by media queries. `true` is returned and this can be used to invalidate utils in developments.

- `generate` is used to transform the recursive map into a CSS output. This is returned as the content of `virtual:@downwind/utils.css` in plugins.
