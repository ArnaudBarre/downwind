import { ResolvedConfig } from "./resolveConfig";
import { SelectorRewrite } from "./types";

export type VariantsMap = Map<string, Variant>;
export type Variant =
  | { selectorRewrite: SelectorRewrite; media?: never; screen?: never }
  | { selectorRewrite?: never; media: string; screen?: string };

export const getVariants = (config: ResolvedConfig) => {
  const variantsMap: VariantsMap = new Map();

  for (const screen in config.theme.screens) {
    const values = config.theme.screens[screen]!;
    if (values.min) {
      if (values.max) {
        variantsMap.set(screen, {
          media: `(min-width: ${values.min}) and (max-width: ${values.max})`,
          screen,
        });
      } else {
        variantsMap.set(screen, {
          media: `(min-width: ${values.min})`,
          screen,
        });
      }
    } else {
      variantsMap.set(screen, { media: `(max-width: ${values.max!})`, screen });
    }
  }

  // Non-compliant: Only support class dark mode
  variantsMap.set("dark", {
    selectorRewrite: (v) => `dark .${v}`,
  });

  [
    "first-letter",
    "first-line",
    "marker", // Non-compliant: No children selector
    "selection", // Non-compliant: No children selector
    ["file", "file-selector-button"],
    "placeholder",
    "before", // Non-compliant: Don't add content property if not present
    "after", // Non-compliant: Don't add content property if not present
  ].forEach((value) => {
    const [prefix, suffix] = Array.isArray(value) ? value : [value, value];
    variantsMap.set(prefix, {
      selectorRewrite: (sel) => `${sel}::${suffix}`,
    });
  });

  [
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
    "disabled",
  ].forEach((value) => {
    const [prefix, suffix] = Array.isArray(value)
      ? value
      : [value, `:${value}`];

    variantsMap.set(prefix, {
      selectorRewrite: (sel) => `${sel}${suffix}`,
    });
    // Non-compliant: Don't support complex stacked variants
    variantsMap.set(`group-${prefix}`, {
      selectorRewrite: (sel) => `group${suffix} .${sel}`,
    });
    variantsMap.set(`peer-${prefix}`, {
      selectorRewrite: (sel) => `peer${suffix} ~ .${sel}`,
    });
  });

  [
    ["motion-safe", "(prefers-reduced-motion: no-preference)"],
    ["motion-reduce", "(prefers-reduced-motion: reduce)"],
    ["print", "print"],
    ["portrait", "(orientation: portrait)"],
    ["landscape", "(orientation: landscape)"],
  ].forEach(([prefix, media]) => {
    variantsMap.set(prefix, { media });
  });

  return variantsMap;
};
