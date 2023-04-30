# Changelog

## Unreleased

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
