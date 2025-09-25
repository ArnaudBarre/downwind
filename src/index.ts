import { loadConfig } from "@arnaud-barre/config-loader";
import { getBase } from "./base/getBase.ts";
import { getDefaults } from "./getDefaults.ts";
import {
  getEntries,
  getRuleMeta,
  isDirectionRule,
  isShortcut,
  isThemeRule,
  type RuleEntry,
} from "./getEntries.ts";
import { getRules, type Rule } from "./getRules.ts";
import { resolveConfig } from "./resolveConfig.ts";
import type {
  CSSEntries,
  Default,
  initDownwind as initDownwindDeclaration,
  staticRules as staticRulesDeclaration,
  UserConfig,
} from "./types.d.ts";
import { formatColor, isColor, parseColor } from "./utils/colors.ts";
import { run } from "./utils/helpers.ts";
import {
  applyVariants,
  arbitraryPropertyMatchToLine,
  cssEntriesToLines,
  printBlock,
  printContainerClass,
  printScreenContainer,
} from "./utils/print.ts";
import { escapeSelector, selectorRE } from "./utils/regex.ts";
import { themeGet } from "./utils/themeGet.ts";
import {
  type AtRuleVariant,
  getVariants,
  type StaticVariant,
} from "./variants.ts";

export const VERSION = __VERSION__;

const applyRE = /[{\s]@apply ([^;}\n]+)([;}\n])/g;
const screenRE = /screen\(([a-z-]+)\)/g;
const themeRE = /theme\("([^)]+)"\)/g;

type Match = {
  token: string;
  variants: StaticVariant[];
  important: boolean;
} & (
  | { type: "Rule"; ruleEntry: RuleEntry }
  | { type: "Arbitrary property"; content: string }
);
type MatchesGroup = {
  matches: Match[];
  atRules: {
    screenKey?: string;
    order: number;
    condition: string;
    content: MatchesGroup;
  }[];
};

export const initDownwind: typeof initDownwindDeclaration = async () => {
  const loadedConfig = globalThis.TEST_CONFIG
    ? { config: globalThis.TEST_CONFIG, files: [] }
    : await loadConfig<UserConfig>("downwind");
  return initDownwindWithConfig({
    config: loadedConfig?.config,
    configFiles: loadedConfig?.files,
  });
};

/** @internal */
export const initDownwindWithConfig = ({
  config: userConfig,
  configFiles = [],
}: {
  config: UserConfig | undefined;
  configFiles?: string[];
}) => {
  const config = resolveConfig(userConfig);
  const defaults = getDefaults(config);
  const { staticVariantsMap, dynamicVariantsMap } = getVariants(config);
  const rules = getRules(config);
  const { rulesEntries, arbitraryEntries } = getEntries(rules);

  const usedKeyframes = new Set<string>();
  const usedDefaults = new Set<Default>();
  const allMatches: MatchesGroup = {
    matches: [],
    atRules:
      // This init is for the `container` edge case
      Object.keys(config.theme.screens).map(
        (screen): MatchesGroup["atRules"][number] => {
          const variant = staticVariantsMap.get(screen) as AtRuleVariant;
          return {
            screenKey: screen,
            order: variant.order,
            condition: variant.condition,
            content: { matches: [], atRules: [] },
          };
        },
      ),
  };
  const allClasses = new Set<string>();
  const blockList = new Set<string>(config.blocklist);
  const addMatch = (match: Match): boolean /* isNew */ => {
    if (allClasses.has(match.token)) return false;
    allClasses.add(match.token);
    let group = allMatches;
    for (const variant of match.variants) {
      if (variant.type === "selectorRewrite") continue;
      let atRule = group.atRules.find(
        (it) => it.condition === variant.condition,
      );
      if (!atRule) {
        atRule = {
          order: variant.order,
          condition: variant.condition,
          content: { matches: [], atRules: [] },
        };
        group.atRules.push(atRule);
      }
      group = atRule.content;
    }
    group.matches.push(match);
    if (match.type === "Rule") {
      const meta = getRuleMeta(match.ruleEntry.rule);
      if (meta?.addDefault) usedDefaults.add(meta.addDefault);
      if (meta?.addKeyframes) {
        const animationProperty = match.ruleEntry.isArbitrary
          ? (match.ruleEntry.value as string)
          : config.theme.animation[match.ruleEntry.key]!;
        const name = animationProperty.slice(0, animationProperty.indexOf(" "));
        if (config.theme.keyframes[name]) usedKeyframes.add(name);
      }
    }
    return true;
  };

  const normalizeArbitraryValue = (raw: string) =>
    raw.startsWith("--") ? `var(${raw})` : raw.replaceAll("_", " ");

  const getModifierValue = (
    rawModifier: string,
    themeMap: Record<string, string | undefined>,
  ) => {
    if (rawModifier.startsWith("[")) {
      if (!rawModifier.endsWith("]")) return;
      return normalizeArbitraryValue(rawModifier.slice(1, -1));
    }
    return themeMap[rawModifier];
  };

  const parseModifier = (
    rawModifier: string,
    rule: Rule,
    key: string,
    arbitraryValue: string | undefined,
  ) => {
    if (isThemeRule(rule) && rule[3]?.lineHeightModifiers) {
      const modifier = getModifierValue(rawModifier, config.theme.lineHeight);
      const fontSize = arbitraryValue ?? rule[1][key];
      if (modifier) {
        return [Array.isArray(fontSize) ? fontSize[0] : fontSize, modifier];
      }
    } else if (isThemeRule(rule) || isDirectionRule(rule)) {
      const alphaModifiers = (isThemeRule(rule) ? rule[3] : rule[4])
        ?.alphaModifiers;
      if (alphaModifiers) {
        const alpha = getModifierValue(rawModifier, alphaModifiers);
        if (alpha) {
          const parsed = parseColor(
            arbitraryValue ?? (isThemeRule(rule) ? rule[1] : rule[2])[key],
          );
          if (parsed && !parsed.alpha) return formatColor({ ...parsed, alpha });
        }
      }
    }
  };

  const parseCache = new Map<string, Match>();
  const parse = (token: string): Match | undefined => {
    if (blockList.has(token)) return;
    const cachedValue = parseCache.get(token);
    if (cachedValue) return cachedValue;

    let important = false;
    let tokenWithoutVariants = token;
    const variants: StaticVariant[] = [];
    let isArbitraryProperty = false;

    const extractVariant = (): StaticVariant | "NO_VARIANT" | undefined => {
      important = tokenWithoutVariants.startsWith("!");
      if (important) tokenWithoutVariants = tokenWithoutVariants.slice(1);
      if (tokenWithoutVariants.startsWith("[")) {
        const index = tokenWithoutVariants.indexOf("]:");
        if (index === -1) {
          // This is not a custom variant. Test
          isArbitraryProperty = true;
          return "NO_VARIANT";
        } else if (important) {
          // Using ! prefix is not valid for variant
          return;
        }
        const content = tokenWithoutVariants.slice(1, index);
        tokenWithoutVariants = tokenWithoutVariants.slice(index + 2);
        if (content.includes("&")) {
          return {
            type: "selectorRewrite",
            selectorRewrite: (v) =>
              content.replaceAll("_", " ").replace("&", v),
          };
        }
        if (content.startsWith("@media")) {
          const media = content.slice(6).replaceAll("_", " ").trim();
          return {
            type: "atRule",
            order: Infinity,
            condition: `@media ${media}`,
          };
        }
        return undefined;
      } else if (important) {
        return "NO_VARIANT"; // Using ! prefix is not valid for variant
      }
      const index = tokenWithoutVariants.indexOf(":");
      if (index === -1) return "NO_VARIANT";
      const dynamicIndex = tokenWithoutVariants.indexOf("-[");
      // -[ can be for arbitrary values
      if (dynamicIndex === -1 || dynamicIndex > index) {
        const prefix = tokenWithoutVariants.slice(0, index);
        tokenWithoutVariants = tokenWithoutVariants.slice(index + 1);
        return staticVariantsMap.get(prefix);
      }
      const endIndex = tokenWithoutVariants.indexOf("]:");
      if (endIndex === -1) return;
      const dynamicPrefix = tokenWithoutVariants.slice(0, dynamicIndex);
      const dynamicVariant = dynamicVariantsMap.get(dynamicPrefix);
      if (!dynamicVariant) return;
      const content = tokenWithoutVariants
        .slice(dynamicIndex + 2, endIndex)
        .replaceAll("_", " ");
      tokenWithoutVariants = tokenWithoutVariants.slice(endIndex + 2);
      switch (dynamicVariant.type) {
        case "dynamicAtRule":
          return {
            type: "atRule",
            order: dynamicVariant.order,
            condition: dynamicVariant.get(content),
          };
        case "dynamicSelectorRewrite":
          return {
            type: "selectorRewrite",
            selectorRewrite: dynamicVariant.get(content),
          };
      }
    };

    let variant = extractVariant();
    while (variant !== "NO_VARIANT") {
      if (!variant) {
        blockList.add(token);
        return;
      }
      variants.push(variant);
      variant = extractVariant();
    }

    // Issue in TS control flow
    if (isArbitraryProperty as boolean) {
      const result: Match = {
        token,
        variants,
        important,
        type: "Arbitrary property",
        content: tokenWithoutVariants.slice(1, -1).replaceAll("_", " "),
      };
      parseCache.set(token, result);
      return result;
    }

    const ruleEntry =
      rulesEntries.get(tokenWithoutVariants)
      ?? run((): RuleEntry | undefined => {
        let start = tokenWithoutVariants.indexOf("-[");
        if (start === -1) {
          start = tokenWithoutVariants.indexOf("/");
          // Neither arbitrary value not modifier and not in map -> not tailwind
          if (start === -1) return;
          const prefix = tokenWithoutVariants.slice(0, start);
          const entry = rulesEntries.get(prefix);
          if (!entry) return;
          const value = parseModifier(
            tokenWithoutVariants.slice(start + 1),
            entry.rule,
            entry.key,
            undefined,
          );
          if (value === undefined) return;
          return {
            rule: entry.rule,
            isArbitrary: true,
            value,
            direction: entry.direction,
            negative: false,
            order: entry.order,
          };
        }
        // Has arbitrary value
        const prefix = tokenWithoutVariants.slice(0, start);
        const entries = arbitraryEntries.get(prefix);
        if (!entries) return;
        const opacityModifierIndex = tokenWithoutVariants.indexOf("]/");
        const arbitraryValueEnd =
          opacityModifierIndex !== -1
            ? opacityModifierIndex
            : tokenWithoutVariants.endsWith("]")
              ? -1
              : undefined;
        if (arbitraryValueEnd === undefined) return;
        const arbitraryValue = tokenWithoutVariants.slice(
          start + 2,
          arbitraryValueEnd,
        );
        const arbitraryEntry =
          entries.length > 1
            ? entries.find((e) =>
                e.validation === "color-only"
                  ? isColor(arbitraryValue) || arbitraryValue.startsWith("--")
                  : true,
              )!
            : entries[0];
        const value =
          opacityModifierIndex !== -1
            ? parseModifier(
                tokenWithoutVariants.slice(opacityModifierIndex + 2),
                arbitraryEntry.rule,
                "",
                normalizeArbitraryValue(arbitraryValue),
              )
            : normalizeArbitraryValue(arbitraryValue);
        if (value === undefined) return;
        return {
          rule: arbitraryEntry.rule,
          isArbitrary: true,
          value,
          direction: arbitraryEntry.direction,
          negative: false,
          order: arbitraryEntry.order,
        };
      });

    if (!ruleEntry) {
      blockList.add(token);
      return;
    }

    const result: Match = {
      token,
      variants,
      important,
      type: "Rule",
      ruleEntry,
    };
    parseCache.set(token, result);
    return result;
  };

  const toCSS = (ruleEntry: RuleEntry, important: boolean): string[] => {
    const rule = ruleEntry.rule;

    if (isShortcut(rule)) {
      return apply({
        tokens: rule[1],
        context: `"${rule[0]}": "${rule[1]}"`,
        from: "SHORTCUT",
      }).cssLines;
    }

    const cssEntries: CSSEntries = isThemeRule(rule)
      ? rule[2](
          ruleEntry.isArbitrary
            ? ruleEntry.value
            : ruleEntry.negative
              ? `-${(rule[1] as Record<string, string>)[ruleEntry.key]}`
              : rule[1][ruleEntry.key],
        )
      : isDirectionRule(rule)
        ? rule[3](
            ruleEntry.direction,
            ruleEntry.isArbitrary
              ? (ruleEntry.value as string)
              : ruleEntry.negative
                ? `-${rule[2][ruleEntry.key]!}`
                : rule[2][ruleEntry.key]!,
          )
        : rule[1];

    return cssEntriesToLines(cssEntries, important);
  };

  const apply = ({
    tokens,
    context,
    from,
  }: {
    tokens: string;
    context: string;
    from: "CSS" | "SHORTCUT";
  }) => {
    const cssLines: string[] = [];
    let invalidateUtils = false;
    for (const token of tokens.split(" ")) {
      if (!token) continue;
      const match = parse(token);
      if (!match) {
        throw new DownwindError(`No rule matching "${token}"`, context);
      }
      if (match.type === "Arbitrary property") {
        cssLines.push(arbitraryPropertyMatchToLine(match));
        continue;
      }
      const meta = getRuleMeta(match.ruleEntry.rule);
      const { hasAtRule, selector } = applyVariants("&", match.variants, meta);
      if (
        hasAtRule
        || !selector.startsWith("&")
        || (meta?.addKeyframes ?? false)
        || meta?.addContainer
      ) {
        throw new DownwindError(
          `Complex utils like "${token}" are not supported.${
            hasAtRule && from === "CSS"
              ? " You can use @media screen(...) for media variants."
              : ""
          }`,
          context,
        );
      }
      if (meta?.addDefault && !usedDefaults.has(meta.addDefault)) {
        usedDefaults.add(meta.addDefault);
        invalidateUtils = true;
      }
      const tokenOutput = toCSS(match.ruleEntry, match.important).join(" ");
      cssLines.push(
        selector === "&" ? tokenOutput : `${selector} { ${tokenOutput} }`,
      );
    }
    return { cssLines, invalidateUtils };
  };

  const getLines = (match: Match) =>
    match.type === "Rule"
      ? toCSS(match.ruleEntry, match.important)
      : [arbitraryPropertyMatchToLine(match)];

  for (const token of config.safelist) {
    const match = parse(token);
    if (!match) {
      throw new DownwindError(
        `No rule matching "${token}" in safelist`,
        JSON.stringify({ safelist: config.safelist }),
      );
    }
    addMatch(match);
  }

  return {
    getBase: () => getBase(config.theme),
    preTransformCSS: (content: string) => {
      let invalidateUtils = false;
      const hasApply = content.includes("@apply ");
      if (hasApply) {
        content = content.replaceAll(
          applyRE,
          (substring, tokens: string, endChar: string) => {
            const result = apply({ tokens, context: substring, from: "CSS" });
            if (result.invalidateUtils && !invalidateUtils) {
              invalidateUtils = true;
            }
            return `${substring[0]}${result.cssLines.join("\n  ")}${
              endChar === ";" ? "" : endChar
            }`;
          },
        );
      }

      const hasScreen = content.includes("screen(");
      if (hasScreen) {
        content = content.replaceAll(screenRE, (substring, value: string) => {
          const variant = staticVariantsMap.get(value);
          if (variant === undefined) {
            throw new DownwindError(
              `No variant matching "${value}"`,
              substring,
            );
          }
          if (
            variant.type !== "atRule"
            || !variant.condition.startsWith("@media ")
          ) {
            throw new DownwindError(
              `"${value}" is not a media variant`,
              substring,
            );
          }
          return variant.condition.slice(7);
        });
      }

      const hasTheme = content.includes('theme("');
      if (hasTheme) {
        content = content.replaceAll(themeRE, (_, path: string) => {
          if (path.includes(" / ")) {
            const [key, alpha] = path.split(" / ");
            const color = themeGet(config.theme, key);
            const parsed = color ? parseColor(color) : undefined;
            if (parsed) return formatColor({ ...parsed, alpha });
          } else {
            const value = themeGet(config.theme, path);
            if (value) return value;
          }
          throw new DownwindError(
            `Could not resolve "${path}" in current theme`,
            `theme(${path})`,
          );
        });
      }

      return { code: content, invalidateUtils };
    },
    scan: (code: string): boolean /* hasNewUtils */ => {
      let hasNewUtils = false;
      for (const [token] of code.matchAll(selectorRE)) {
        const match = parse(token);
        if (match && addMatch(match)) hasNewUtils = true;
      }
      return hasNewUtils;
    },
    generate: () => {
      let useContainer = false;
      let utilsOutput = "";

      const printMatchesGroup = (group: MatchesGroup, indentation: string) => {
        group.matches.sort((a, b) => {
          const diff = getOrder(a) - getOrder(b);
          if (diff !== 0) return diff;
          return a.token.localeCompare(b.token);
        });
        let nextLines: string[] | undefined = undefined;
        for (const [idx, match] of group.matches.entries()) {
          const meta =
            match.type === "Rule"
              ? getRuleMeta(match.ruleEntry.rule)
              : undefined;
          if (meta?.addContainer) {
            if (indentation === "") {
              useContainer = true;
              utilsOutput += printContainerClass(config.theme.container);
            }
            continue;
          }
          const { selector } = applyVariants(
            `.${escapeSelector(match.token)}`,
            match.variants,
            meta,
          );
          const lines: string[] = nextLines ?? getLines(match);
          const nextMatch = group.matches.at(idx + 1);
          nextLines = nextMatch ? getLines(nextMatch) : undefined;
          if (
            lines.length === nextLines?.length
            && nextLines.every((l, i) => l === lines[i])
            && !isUnsafeSelector(selector)
          ) {
            utilsOutput += `${indentation}${selector},\n`;
          } else {
            utilsOutput += printBlock(selector, lines, indentation);
          }
        }

        group.atRules.sort((a, b) => {
          const diff = a.order - b.order;
          if (diff !== 0) return diff;
          return a.condition.localeCompare(b.condition);
        });
        for (const atRule of group.atRules) {
          const screenConf =
            useContainer && atRule.screenKey
              ? config.theme.screens[atRule.screenKey]
              : undefined;
          if (screenConf?.min && screenConf.max !== undefined) {
            // If max is defined, we need to use a separate media query
            const declaration = printScreenContainer(
              config,
              atRule.screenKey!,
              screenConf.min,
            );
            utilsOutput += `@media (min-width: ${screenConf.min}) {\n${declaration}\n}\n`;
          }
          const printScreenContainerMin =
            screenConf?.min && screenConf.max === undefined
              ? screenConf.min
              : undefined;
          if (!printScreenContainerMin && isMatchesGroupEmpty(atRule.content)) {
            continue;
          }
          utilsOutput += `${indentation}${atRule.condition} {\n`;
          if (printScreenContainerMin) {
            const declaration = printScreenContainer(
              config,
              atRule.screenKey!,
              printScreenContainerMin,
            );
            utilsOutput += `${declaration}\n`;
          }
          printMatchesGroup(atRule.content, `${indentation}  `);
          utilsOutput += `${indentation}}\n`;
        }
      };

      printMatchesGroup(allMatches, "");

      let header = "";
      if (usedDefaults.size) {
        header += printBlock(
          "*, ::before, ::after, ::backdrop",
          cssEntriesToLines(
            [...usedDefaults].sort().flatMap((d) => defaults[d]),
            false,
          ),
        );
        header += "\n";
      }
      for (const name of usedKeyframes) {
        header += `@keyframes ${name} {\n  ${config.theme.keyframes[
          name
        ]!}\n}\n`;
      }
      if (usedKeyframes.size) header += "\n";

      return header + utilsOutput;
    },
    codegen: ({
      mode,
    }: {
      mode: "WITH_CONTENT" | "OMIT_CONTENT" | "DEVTOOLS";
    }) => {
      if (mode !== "WITH_CONTENT") {
        const prefix = mode === "DEVTOOLS" ? ".downwind" : "";
        return Array.from(rulesEntries.keys())
          .map((name) => `${prefix}.${escapeSelector(name)}{}`)
          .join(mode === "DEVTOOLS" ? "" : "\n");
      }

      return Array.from(rulesEntries.entries())
        .map(([name, ruleEntry]) => {
          const ruleMeta = getRuleMeta(ruleEntry.rule);
          if (ruleMeta?.addContainer) {
            return printContainerClass(config.theme.container);
          }
          let selector = `.${escapeSelector(name)}`;
          if (ruleMeta?.selectorRewrite) {
            selector = ruleMeta.selectorRewrite(selector);
          }
          return printBlock(selector, toCSS(ruleEntry, false));
        })
        .join("");
    },
    configFiles,
  };
};

const isMatchesGroupEmpty = (group: MatchesGroup) => {
  if (group.matches.length) return false;
  for (const atRule of group.atRules) {
    if (!isMatchesGroupEmpty(atRule.content)) return false;
  }
  return true;
};

const getOrder = (match: Match) =>
  match.type === "Rule" ? match.ruleEntry.order : Infinity;

// If selector contains a vendor prefix after a pseudo element or class,
// we consider them separately because merging the declarations into
// a single rule will cause browsers that do not understand the
// vendor prefix to throw out the whole rule
// lightningcss smartly separate them afterward, but esbuild does not
// For `:has`, for people that really want progressive enhancement for
// they CSS should use lightningcss as a post processor
const isUnsafeSelector = (selector: string) =>
  selector.includes(":-") || selector.includes("::-");

export const staticRules: typeof staticRulesDeclaration = (rules) =>
  Object.entries(rules).map(([key, value]) => [key, Object.entries(value)]);

export class DownwindError extends Error {
  context: string;

  constructor(message: string, content: string) {
    super(message);
    this.name = this.constructor.name;
    this.context = content;
  }
}
