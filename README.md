# downwind

A PostCSS-less implementation of Tailwind based on [@parcel/css](https://github.com/parcel-bundler/parcel-css) with an API optimized for dev server like [Vite](https://github.com/vitejs/vite).

Inspired by [unocss](https://github.com/unocss/unocss).

## Usage with [esbuild](https://github.com/evanw/esbuild)

Here is an example when supporting Safari 13 as a minimum target:

```ts
import { esbuildPlugins as downwind } from "@arnaud-barre/downwind";
import { build } from "esbuild";

await build({
  bundle: true,
  // entryPoints, sourcemap, minify, outdir, ...
  target: ["safari13"],
  plugins: [...downwind({ safari: 13 << 16 })],
});
```

## Differences

### Components

Downwind doesn't have the notion of components, but custom plugins can be injected before core plugins by using `injectFirst: true`.

Shortcuts from [Windi CSS](https://windicss.org/features/shortcuts.html#shortcuts) solves most the needs and will be implemented.

### Arbitrary values

The implementation would work most of the time, but some shortcuts have been made to keep the implementation lean and fast:

- Arbitrary alpha is not supported (yet)
- backgroundImage, backgroundPosition and fontFamily are not supported
- For prefix with collision (divide, border, bg, stroke, text, decoration, outline, ring, ring-offset), if the value doesn't match a CSS color (hex, rgba?, hsla?) it's interpreted as the "size" version. Using data types is not supported
- Underscore are always mapped to space

When implemented, [arbitrary properties](https://tailwindcss.com/docs/adding-custom-styles#arbitrary-properties) could be use to bypass the rare edge cases.

## TODO

- vite plugin
- variants in css files
- shortcuts
- lighter ring, transform, filter, font-variant-numeric
- arbitrary properties: https://tailwindcss.com/docs/adding-custom-styles#arbitrary-properties
