# downwind [![npm](https://img.shields.io/npm/v/@arnaud-barre/downwind)](https://www.npmjs.com/package/@arnaud-barre/downwind)

A PostCSS-less implementation of Tailwind based on [Lightning CSS](https://github.com/parcel-bundler/lightningcss) with an API optimized for dev server like [Vite](https://github.com/vitejs/vite).

Inspired by [unocss](https://github.com/unocss/unocss).

## Usage with [vite](https://vitejs.dev/)

```ts
// vite.config.ts
import { downwind } from "@arnaud-barre/downwind/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [downwind()] });
```

Add `import "virtual:@downwind/base.css";` and `import "virtual:@downwind/utils.css";` to your code.

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

Nesting and CSS modules are directly supported via lightningcss.

## Scanned extension

For almost all UI application, the CSS classes are always located in the same file extension (`tsx`, `vue`, `svelte`).

By default, downwind will only scan the file with matches the `scannedExtension` (default to `tsx`).

It can be changed in both plugins:

```ts
plugins: [downwind({ scannedExtension: "vue" })];
```

For cases where you need any other file to be scanned, include the `@downwind-scan` pragma in any comment of the file.

## Configuration

This is optional and can be used to customize the default theme, disable core rules, add new rules, shortcuts or a safelist.

The file should be name `downwind.config.ts`.

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

### Extending theme

Only a shallow merge is done, so extending the color palette is a little more verbose.

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

Can be overridden by margin utility and doesn't work for flex-reverse.

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

Internally downwind flatten the palette color, so you should use `theme(colors.blue-500)` instead of `theme(colors.blue.500)`

### Almost exhaustive list of non-supported features

- [prefix](https://tailwindcss.com/docs/configuration#prefix), [separator](https://tailwindcss.com/docs/configuration#separator) and [important](https://tailwindcss.com/docs/configuration#important) configuration options
- These utils: `transform`, `transform-cpu`, `decoration-slice` `decoration-clone`, `filter`, `backdrop-filter`, `blur-0`
- Using multiple group and peer variants (i.e. `group-active:group-hover:bg-blue-200` doesn't work)
- `@tailwind` and `@layer` directives
- `@apply` for anything else than utils
- `!important` at the end of `@apply` statement
- Using pre-processor like `Sass` or `less`
- `border-spacing` utility
- `rtl` variant
- Object for keyframes definition
- Multiple keyframes in animation
- Letter spacing in fontSize theme
- Regular expressions in safelist
