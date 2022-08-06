# downwind

A PostCSS-less implementation of Tailwind based on [@parcel/css](https://github.com/parcel-bundler/parcel-css) with an API optimized for dev server like [Vite](https://github.com/vitejs/vite).

Inspired by [unocss](https://github.com/unocss/unocss).

## Usage with [vite](https://vitejs.dev/)

```ts
// vite.config.ts
import { downwind } from "@arnaud-barre/downwind/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [downwind()] });
```

Add `import "virtual:@downwind/base.css";` and `import "virtual:@downwind/utils.css";` to your code.

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

## Differences

### Components

Downwind doesn't have the notion of components, but custom plugins can be injected before core plugins by using `injectFirst: true`.

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

- Arbitrary alpha is not supported (yet)
- backgroundImage, backgroundPosition and fontFamily are not supported
- For prefix with collision (divide, border, bg, stroke, text, decoration, outline, ring, ring-offset), if the value doesn't match a CSS color (hex, rgba?, hsla?) it's interpreted as the "size" version. Using data types is not supported
- Underscore are always mapped to space

When implemented, [arbitrary properties](https://tailwindcss.com/docs/adding-custom-styles#arbitrary-properties) could be use to bypass the rare edge cases.

## TODO

- arbitrary alpha
- colored box shadow?
- lighter ring, transform, filter, font-variant-numeric
- workaround https://github.com/parcel-bundler/parcel-css/issues/246 if not fixed
- preTransform utils that requires keyframes or default
- arbitrary properties: https://tailwindcss.com/docs/adding-custom-styles#arbitrary-properties
