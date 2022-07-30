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

## TODO

- arbitrary values
- vite plugin
- variants in css files
- shortcuts
- lighter ring, transform, filter, font-variant-numeric
