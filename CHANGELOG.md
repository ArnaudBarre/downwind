# Changelog

## Unreleased

- Remove interval check in Vite plugin
- Use rolldown filters for scan filtering, requires Vite 6.3+ or rolldown-vite
- Add experimental `toInlineCSS`

## 0.7.7

- Fix overscroll util

## 0.7.6

- Align with Tailwind 3.4.6

## 0.7.5

- Align `base.css` with Tailwind 3.4.2
- Support named color (ie `text-[red]` generate a color utility)
- Skip merging of utilities that contains vendor prefixes

## 0.7.4

- Actually fix plugin usage in build watch mode

## 0.7.3

- Align with Tailwind 3.4: https://tailwindcss.com/blog/tailwindcss-v3-4
- Support main dynamic variants (`min-*`, `max-*`, `has-*`, `(group/peer-)data-*`, `(group/peer-)aria-*`)

## 0.7.2

- Fix plugin usage in build watch mode

## 0.7.1

- Sort defaults to get a stable output
- Internally consider media & supports variant as `atRule`s so that the nesting output is closer to Tailwind
- Group selectors with same content. Pre 0.7 this optimization was done by Lightning CSS and esbuild does not support this optimization when minifying

## 0.7.0

### Remove dependency on LightningCSS

This was here mostly because I wanted to get CSS modules and Tailwind working with esbuild. Now that esbuild support CSS modules, I can remove this coupling and makes this repo easier to re-use in other bundlers. This also mean I'm dropping from this repo features related to build tools, like `downwind.transform`, `cssModuleToJS` & `convertTargets`. The rest of the core downwind object API has also been updated to give more flexibility outside of built-in plugins.

For usage Vite, you can get back the same behaviour by using the builtin support for lightningCSS:

```js
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

### Interval check during builds for plugins

Using the bundler to discover file to scan is the main reason of this fork. But it poses a problem for builds: we need to be sure to have scan every UI files before generating the output.

Previously this was done line in unocss by injecting a placeholder, and inside the "onEnd" callback, replacing it with the generated output. But this mess up with sourcemap and content hashing, and the plugins where doing some hack around this.

To simplify the code, I now delayed the generation the virtual utils module until other files are scanned. But there is no API to be sure every other files is processed, so for now the build is checking at a fixed interval if some work was done in the previous Xms and if not, generate the utils. This interval is configurable and default to `50ms` for the esbuild plugin and `200ms` for the Vite plugin.

This is not perfect, but I think that the cost of waiting few hundred milliseconds in a build is better than having utils not processed and minified like the rest of the CSS files.

### Fix important modifier with variant

There was a involuntary mismatch with Tailwind when applying the important modifier (`!`) with a variant, the implementation required to use `!hover:font-medium` instead of `hover:!font-medium`. This has been changed to match Tailwind syntax.

### Scanning update

The read of https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-8/ make me realize the current regex approach was really inefficient: instead of search for "strings" and then for classes inside strings, we should directly grep all patterns that looks like a Tailwind classes, and by having a strict subset on the left border (``'"`\s}``), the first character (`a-z0-9![-`), the last char (`a-z0-9%]`) and the right border (``'"`\s:$``), we can get a good ratio of matches. This means that custom utils & shortcuts should be at least 2 chars.

This change uses a lookbehind assertion for the left border, which means that if a playground was made, it would not work with Safari before 16.4.

This new approach also allow for quotes inside custom values, which makes `before:content-['hello_world']` & `[&[data-selected="true"]]:bg-blue-100` now possible in downwind.

The parser has been modified to parse arbitrary values before modifiers (opacity, line height) so that `/` can be used inside arbitrary values. `text-[calc(3rem/5)]/[calc(4rem/5)]` is now supported.

And the nice part is that it's also quite fast. When running (mac M1) on 281 tsx files of my production codebase, time running regex went from `90ms` to `13ms` (and 125543 to 33992 candidates). For the total time (init, scan & CSS generation), the time went from `117ms` to `36ms`. The perf update is completely crushed by the 'Interval check' change, but this is nice to see that a new approach with less limitations is also faster!

## 0.6.2

Align with Tailwind 3.3.3:

- Updated preflight with reset of dialog padding
- Fix gradients implementation

## 0.6.1

Use exports map

## 0.6.0

Publish as ESM

## 0.5.1

Fix TS imports in bundle

## 0.5.0

Align with Tailwind 3.3:

- Extend default color palette with new 950 shades
- Add line-height modifier support to font-size utilities
- Add support for using variables as arbitrary values without `var(...)`
- Added utilities: `hyphens`, `from-{position}`, `via-{position}`, `to-{position}`, `list-style-image`, `caption-side`, `delay-0`, `duration-0`, `justify-normal`,`justify-stretch`, `content-normal`, `content-stretch`, `whitespace-break-spaces`
- Add blocklist option to prevent generating unwanted CSS
- Use inset instead of top, right, bottom, and left properties
- Reset all properties when using `line-clamp-none`

The main potential breaking change is that gradient steps for arbitrary values can now become position if not detected as a color.

Logical properties & font-variation-settings are currently out of scope.

## 0.4.5

- Fix generate CLI when output doesn't exist
- Fix: Throw when using invalid rule in `@apply` that was previously scanned

## 0.4.4

Fix `appearance-none`

## 0.4.3

- Fix cssModuleToJS with kebab case classes
- Fix transition rule without DEFAULT

## 0.4.2

- Fix crash when using arbitrary values for `animate` rule
- esbuild plugin: Skip postprocessing when build contains errors to avoid crash

## 0.4.1

- Fix: Allow `,` in selectors
- Fix: Map `_` to spaces in arbitrary properties

## 0.4.0

- Support [Design in devtools](https://twitter.com/antfu7/status/1372244287975387145) in the Vite plugin
- Always group tokens per media query and sort variants with a deterministic order
- Breaking: Change codegen API to include a `DEVTOOLS` mode
- esbuild plugin throw instead of adding an error to ensure proper logging to the console ([esbuild#2625](https://github.com/evanw/esbuild/issues/2625))

## 0.3.0

Align with Tailwind 3.2:

- Add `supports-*` and `max-<screen>` dynamic variants
- Add `collapse`, `place-content-baseline`, `place-items-baseline`, `content-baseline`, `break-keep`, `fill-none` & `stroke-none` utilities
- Support negative values for `outline-offset` utility
- Fix some cases for arbitrary variants and handle "arbitrary media" (ex: `[@media(min-width:900px)]:block`)

Other features are not supported, but container queries will probably be added later.

## 0.2.6

Add `scanRegex` option for esbuild plugin

## 0.2.5

Stable order for arbitrary values of the same rule. It's now based on the string match instead of the scan order

## 0.2.4

- Use Lightning CSS to print utils in dev. This fixes usage of variants in shortcuts
- Add `configFiles` to Downwind object

## 0.2.3

Add DownwindError to types

## 0.2.2

Fix: Support arbitrary variants with `>`, `*`, `+` and `~`

## 0.2.1

esbuild plugin: Fix metafile output (remove map & update cssBundle prop)

## 0.2.0

Breaking:

- Use flat color palette in theme (i.e. `blue: { 300: "#93c5fd", 400: "#60a5fa" }` -> `"blue-300": "#93c5fd", "blue-400": "#60a5fa"`)
- Theme function requires double quotes and always uses `key.value` syntax (`theme(spacing[2.5])` -> `theme("spacing.2.5")`)

## 0.1.4

- Parcel CSS -> Lightning CSS
- Sort keys for CSSModuleExports

## 0.1.3

Bump config-loader

## 0.1.2

Fix issue with inset-x/y

## 0.1.1

Add `%` to the scan regex

## 0.1.0

Initial release
