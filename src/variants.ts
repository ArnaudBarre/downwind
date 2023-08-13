import { type ResolvedConfig } from "./resolveConfig.ts";
import type { SelectorRewrite } from "./types.d.ts";

export type VariantsMap = Map<string, Variant>;
export type Variant =
  | { type: "selectorRewrite"; selectorRewrite: SelectorRewrite }
  | { type: "media"; key: string; order: number; media: string }
  | { type: "supports"; supports: string };

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
export const getVariants = (config: ResolvedConfig) => {
  const variantsMap: VariantsMap = new Map();
  let mediaOrder = 0;

  const screensEntries = Object.entries(config.theme.screens);
  for (const [screen, values] of screensEntries) {
    if (values.min) {
      if (values.max) {
        variantsMap.set(screen, {
          type: "media",
          key: screen,
          order: mediaOrder++,
          media: `(min-width: ${values.min}) and (max-width: ${values.max})`,
        });
      } else {
        variantsMap.set(screen, {
          type: "media",
          key: screen,
          order: mediaOrder++,
          media: `(min-width: ${values.min})`,
        });
      }
    } else {
      variantsMap.set(screen, {
        type: "media",
        key: screen,
        order: mediaOrder++,
        media: `(max-width: ${values.max!})`,
      });
    }
  }

  if (screensEntries.every((e) => e[1].min && !e[1].max)) {
    for (const [name, { min }] of screensEntries) {
      variantsMap.set(`max-${name}`, {
        type: "media",
        key: `max-${name}`,
        order: mediaOrder++,
        media: `not all and (max-width: ${min!})`,
      });
    }
  }

  // Non-compliant: Only support class dark mode
  variantsMap.set("dark", {
    type: "selectorRewrite",
    selectorRewrite: (v) => `.dark ${v}`,
  });

  for (const value of [
    "first-letter",
    "first-line",
    "marker", // Non-compliant: No children selector
    "selection", // Non-compliant: No children selector
    ["file", "file-selector-button"],
    "placeholder",
    "backdrop",
    "before", // Non-compliant: Don't add content property if not present
    "after", // Non-compliant: Don't add content property if not present
  ]) {
    const [prefix, suffix] = Array.isArray(value) ? value : [value, value];
    variantsMap.set(prefix, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `${sel}::${suffix}`,
    });
  }

  for (const value of [
    // Positional
    ["first", ":first-child"],
    ["last", ":last-child"],
    ["only", ":only-child"],
    ["odd", ":nth-child(odd)"],
    ["even", ":nth-child(even)"],
    "first-of-type",
    "last-of-type",
    "only-of-type",

    // State
    "visited", // Non-compliant: Don't remove opacity modifiers
    "target",
    ["open", "[open]"],

    // Forms
    "default",
    "checked",
    "indeterminate",
    "placeholder-shown",
    "autofill",
    "required",
    "valid",
    "invalid",
    "in-range",
    "out-of-range",
    "read-only",

    // Content
    "empty",

    // Interactive
    "focus-within",
    "hover",
    "focus",
    "focus-visible",
    "active",
    "enabled",
    "enabled",
    "disabled",
  ]) {
    const [prefix, suffix] = Array.isArray(value)
      ? value
      : [value, `:${value}`];

    variantsMap.set(prefix, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `${sel}${suffix}`,
    });
    // Non-compliant: Don't support complex stacked variants
    variantsMap.set(`group-${prefix}`, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `.group${suffix} ${sel}`,
    });
    variantsMap.set(`peer-${prefix}`, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `.peer${suffix} ~ ${sel}`,
    });
  }

  for (const [key, media] of [
    ["motion-safe", "(prefers-reduced-motion: no-preference)"],
    ["motion-reduce", "(prefers-reduced-motion: reduce)"],
    ["print", "print"],
    ["portrait", "(orientation: portrait)"],
    ["landscape", "(orientation: landscape)"],
    ["contrast-more", "(prefers-contrast: more)"],
    ["contrast-less", "(prefers-contrast: less)"],
  ]) {
    variantsMap.set(key, { type: "media", key, order: mediaOrder++, media });
  }

  for (const [key, value] of Object.entries(config.theme.supports)) {
    variantsMap.set(`supports-${key}`, {
      type: "supports",
      supports: `(${value!})`,
    });
  }

  return variantsMap;
};
