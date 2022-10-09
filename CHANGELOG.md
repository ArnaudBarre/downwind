# Changelog

## Unreleased

- Use Lightning CSS to print utils in dev. This fixes usage of variants in shortcuts
- Bump config-loader

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
