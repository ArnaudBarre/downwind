import type { ResolvedConfig } from "./resolveConfig.ts";
import type { SelectorRewrite } from "./types.d.ts";

export type StaticVariant =
  | { type: "selectorRewrite"; selectorRewrite: SelectorRewrite }
  | AtRuleVariant;
export type AtRuleVariant = {
  type: "atRule";
  order: number;
  condition: string;
};

type DynamicVariant =
  | {
      type: "dynamicAtRule";
      order: number;
      prefix: string;
      get: (content: string) => /* condition */ string;
    }
  | {
      type: "dynamicSelectorRewrite";
      prefix: string;
      get: (content: string) => SelectorRewrite;
    };

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
export const getVariants = (config: ResolvedConfig) => {
  const staticVariantsMap = new Map<string, StaticVariant>();
  const dynamicVariantsMap = new Map<string, DynamicVariant>();
  let atRuleOrder = 0;

  const screensEntries = Object.entries(config.theme.screens);
  for (const [screen, values] of screensEntries) {
    if (values.min) {
      if (values.max) {
        staticVariantsMap.set(screen, {
          type: "atRule",
          order: atRuleOrder++,
          condition: `@media (min-width: ${values.min}) and (max-width: ${values.max})`,
        });
      } else {
        staticVariantsMap.set(screen, {
          type: "atRule",
          order: atRuleOrder++,
          condition: `@media (min-width: ${values.min})`,
        });
      }
    } else {
      staticVariantsMap.set(screen, {
        type: "atRule",
        order: atRuleOrder++,
        condition: `@media (max-width: ${values.max!})`,
      });
    }
  }

  if (screensEntries.every((e) => e[1].min && !e[1].max)) {
    for (const [name, { min }] of screensEntries) {
      staticVariantsMap.set(`max-${name}`, {
        type: "atRule",
        order: atRuleOrder++,
        condition: `@media not all and (min-width: ${min!})`,
      });
    }
  }

  dynamicVariantsMap.set("min", {
    type: "dynamicAtRule",
    order: atRuleOrder++,
    prefix: "min",
    get: (content) => `@media (min-width: ${content})`,
  });
  dynamicVariantsMap.set("max", {
    type: "dynamicAtRule",
    order: atRuleOrder++,
    prefix: "max",
    get: (content) => `@media (max-width: ${content})`,
  });

  // Non-compliant: Only support class dark mode
  staticVariantsMap.set("dark", {
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
    staticVariantsMap.set(prefix, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `${sel}::${suffix}`,
    });
  }

  const withGroupAndPeer = (prefix: string, suffix: string) => {
    staticVariantsMap.set(prefix, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `${sel}${suffix}`,
    });
    // Non-compliant: Don't support complex stacked variants
    staticVariantsMap.set(`group-${prefix}`, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `.group${suffix} ${sel}`,
    });
    staticVariantsMap.set(`peer-${prefix}`, {
      type: "selectorRewrite",
      selectorRewrite: (sel) => `.peer${suffix} ~ ${sel}`,
    });
  };

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

    withGroupAndPeer(prefix, suffix);
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
    staticVariantsMap.set(key, {
      type: "atRule",
      order: atRuleOrder++,
      condition: `@media ${media}`,
    });
  }

  for (const [key, value] of Object.entries(config.theme.supports)) {
    staticVariantsMap.set(`supports-${key}`, {
      type: "atRule",
      condition: `@supports (${value!})`,
      order: atRuleOrder++,
    });
  }
  dynamicVariantsMap.set("supports", {
    type: "dynamicAtRule",
    order: atRuleOrder++,
    prefix: "supports",
    get: (content) => {
      const check = content.includes(":") ? content : `${content}: var(--tw)`;
      return `@supports (${check})`;
    },
  });

  const withDynamicGroupAndPeer = (
    prefix: string,
    getSuffix: (content: string) => string,
  ) => {
    dynamicVariantsMap.set(prefix, {
      type: "dynamicSelectorRewrite",
      prefix,
      get: (content) => (sel) => `${sel}${getSuffix(content)}`,
    });
    // Non-compliant: Don't support complex stacked variants
    dynamicVariantsMap.set(`group-${prefix}`, {
      type: "dynamicSelectorRewrite",
      prefix: `group-${prefix}`,
      get: (content) => (sel) => `.group${getSuffix(content)} ${sel}`,
    });
    dynamicVariantsMap.set(`peer-${prefix}`, {
      type: "dynamicSelectorRewrite",
      prefix: `peer-${prefix}`,
      get: (content) => (sel) => `.peer${getSuffix(content)} ~ ${sel}`,
    });
  };

  for (const [key, value] of Object.entries(config.theme.aria)) {
    withGroupAndPeer(`aria-${key}`, `[aria-${value!}]`);
  }
  withDynamicGroupAndPeer("aria", (content) => `[aria-${content}]`);
  for (const [key, value] of Object.entries(config.theme.data)) {
    withGroupAndPeer(`data-${key}`, `[data-${value!}]`);
  }
  withDynamicGroupAndPeer("data", (content) => `[data-${content}]`);

  return { staticVariantsMap, dynamicVariantsMap };
};
