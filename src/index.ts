import { readFileSync } from "fs";
import { relative } from "node:path";
import { loadConfig } from "@arnaud-barre/config-loader";
import { Dependency, transform } from "lightningcss";

import { getBase } from "./base/getBase";
import { getDefaults } from "./getDefaults";
import {
  getRuleMeta,
  getEntries,
  isDirectionRule,
  isShortcut,
  isThemeRule,
  RuleEntry,
} from "./getEntries";
import { resolveConfig } from "./resolveConfig";
import {
  staticRules as staticRulesDeclaration,
  CSSEntries,
  Default,
  initDownwind as initDownwindDeclaration,
  UserConfig,
} from "./types";
import { formatColor, isColor, parseColor } from "./utils/colors";
import { forceDownlevelNesting } from "./utils/convertTargets";
import {
  applyVariants,
  arbitraryPropertyMatchToLine,
  cssEntriesToLines,
  escapeSelector,
  printBlock,
  printContainerClass,
  printScreenContainer,
} from "./utils/print";
import { themeGet } from "./utils/themeGet";
import { getVariants, Variant } from "./variants";

export const VERSION = __VERSION__;
export { cssModuleToJS } from "./utils/modules";
export { convertTargets } from "./utils/convertTargets";

const arbitraryValueRE = /-\[.+]$/;
const applyRE = /[{\s]@apply ([^;}\n]+)([;}\n])/g;
const screenRE = /screen\(([a-z-]+)\)/g;
const themeRE = /theme\("([^)]+)"\)/g;
const validSelectorRE = /^[a-z0-9.:/_[\]!#%&>+~*()-]+$/;
const arbitraryPropertyRE = /^\[[^[\]:]+:[^[\]:]+]$/;

type Match = {
  token: string;
  variants: Variant[];
  screen: string;
  important: boolean;
} & (
  | { type: "Rule"; ruleEntry: RuleEntry }
  | { type: "Arbitrary property"; content: string }
);

export const initDownwind: typeof initDownwindDeclaration = async (opts) => {
  const loadedConfig = globalThis.TEST_CONFIG
    ? { config: globalThis.TEST_CONFIG, files: [] }
    : await loadConfig<UserConfig>("downwind");
  return initDownwindWithConfig({
    config: loadedConfig?.config,
    configFiles: loadedConfig?.files,
    ...opts,
  });
};

export const initDownwindWithConfig = ({
  config: userConfig,
  configFiles = [],
  targets = forceDownlevelNesting,
  scannedExtension = "tsx",
  root = process.cwd(),
}: {
  config: UserConfig | undefined;
  configFiles?: string[];
} & Parameters<typeof initDownwindDeclaration>[0]) => {
  const config = resolveConfig(userConfig);
  const defaults = getDefaults(config);
  const variantsMap = getVariants(config);
  const { rulesEntries, arbitraryEntries } = getEntries(config);

  const usedKeyframes = new Set<string>();
  const usedDefaults = new Set<Default>();
  const allMatches = new Map<string, Match[]>([
    ["", [] as Match[]],
    ...Object.keys(config.theme.screens).map((screen): [string, Match[]] => [
      screen,
      [],
    ]),
  ]);
  const allClasses = new Set<string>();
  const blockList = new Set<string>();
  const addMatch = (match: Match): boolean /* isNew */ => {
    if (allClasses.has(match.token)) return false;
    allClasses.add(match.token);
    allMatches.get(match.screen)!.push(match);
    if (match.type === "Rule") {
      const meta = getRuleMeta(match.ruleEntry.rule);
      if (meta?.addDefault) usedDefaults.add(meta.addDefault);
      if (meta?.addKeyframes) {
        const animationProperty = config.theme.animation[match.ruleEntry.key]!;
        const name = animationProperty.slice(0, animationProperty.indexOf(" "));
        if (config.theme.keyframes[name]) usedKeyframes.add(name);
      }
    }
    return true;
  };

  const parseCache = new Map<string, Match>();
  const parse = (token: string): Match | undefined => {
    if (blockList.has(token)) return;
    const cachedValue = parseCache.get(token);
    if (cachedValue) return cachedValue;

    const important = token.startsWith("!");
    let tokenWithoutVariants = important ? token.slice(1) : token;
    let screen = "";
    const variants: Variant[] = [];
    let isArbitraryProperty = false;

    const extractVariant = () => {
      if (tokenWithoutVariants.startsWith("[")) {
        if (arbitraryPropertyRE.test(tokenWithoutVariants)) {
          isArbitraryProperty = true;
          return "NO_VARIANT" as const;
        }
        const index = tokenWithoutVariants.indexOf("]:");
        if (index === -1) return;
        const content = tokenWithoutVariants.slice(1, index);
        if (!content.includes("&")) return;
        const arbitraryVariant: Variant = {
          selectorRewrite: (v) => content.replace("&", v),
        };
        tokenWithoutVariants = tokenWithoutVariants.slice(index + 2);
        return arbitraryVariant;
      }
      const index = tokenWithoutVariants.indexOf(":");
      if (index === -1) return "NO_VARIANT";
      const prefix = tokenWithoutVariants.slice(0, index);
      tokenWithoutVariants = tokenWithoutVariants.slice(index + 1);
      return variantsMap.get(prefix);
    };

    let variant = extractVariant();
    while (variant !== "NO_VARIANT") {
      if (!variant || (screen && variant.screen)) {
        blockList.add(token);
        return;
      }
      if (variant.screen) screen = variant.screen;
      else variants.push(variant);
      variant = extractVariant();
    }

    // Issue in TS control flow
    if (isArbitraryProperty as boolean) {
      const result: Match = {
        token,
        variants,
        screen,
        important,
        type: "Arbitrary property",
        content: tokenWithoutVariants.slice(1, -1),
      };
      parseCache.set(token, result);
      return result;
    }

    let ruleEntry = rulesEntries.get(tokenWithoutVariants);
    if (!ruleEntry) {
      let start = tokenWithoutVariants.indexOf("/");
      // eslint-disable-next-line no-negated-condition
      if (start !== -1) {
        const prefix = tokenWithoutVariants.slice(0, start);
        const entry = rulesEntries.get(prefix);
        if (entry && (isThemeRule(entry.rule) || isDirectionRule(entry.rule))) {
          const alphaModifiers = (
            isThemeRule(entry.rule) ? entry.rule[3] : entry.rule[4]
          )?.alphaModifiers;
          if (alphaModifiers) {
            const alphaModifier = tokenWithoutVariants.slice(start + 1);
            const alpha = alphaModifier.startsWith("[")
              ? alphaModifier.endsWith("]")
                ? alphaModifier.slice(1, -1)
                : undefined
              : alphaModifiers[alphaModifier];
            if (alpha) {
              const parsed = parseColor(
                (isThemeRule(entry.rule) ? entry.rule[1] : entry.rule[2])[
                  entry.key
                ],
              );
              if (parsed && !parsed.alpha) {
                ruleEntry = {
                  rule: entry.rule,
                  key: formatColor({ ...parsed, alpha }),
                  direction: entry.direction,
                  negative: false,
                  order: entry.order,
                  isArbitrary: true,
                };
              }
            }
          }
        }
      } else {
        start = tokenWithoutVariants.indexOf("[");
        if (start !== -1 && arbitraryValueRE.test(tokenWithoutVariants)) {
          const prefix = tokenWithoutVariants.slice(0, start - 1);
          const entries = arbitraryEntries.get(prefix);
          if (entries) {
            const value = tokenWithoutVariants.slice(start + 1, -1);
            const entry =
              entries.length > 1
                ? entries.find((e) =>
                    e.validation === "color-only" ? isColor(value) : true,
                  )!
                : entries[0];
            ruleEntry = {
              rule: entry.rule,
              key: value.replaceAll("_", " "),
              direction: entry.direction,
              negative: false,
              order: entry.order,
              isArbitrary: true,
            };
          }
        }
      }
    }

    if (!ruleEntry) {
      blockList.add(token);
      return;
    }

    const result: Match = {
      token,
      variants,
      screen,
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
            ? ruleEntry.key
            : ruleEntry.negative
            ? `-${(rule[1] as Record<string, string>)[ruleEntry.key]}`
            : rule[1][ruleEntry.key]!,
        )
      : isDirectionRule(rule)
      ? rule[3](
          ruleEntry.direction,
          ruleEntry.isArbitrary
            ? ruleEntry.key
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
      let hasMedia = !!match.screen;
      const selector = applyVariants("&", match.variants, meta, () => {
        hasMedia = true;
      });
      if (
        hasMedia ||
        !selector.startsWith("&") ||
        meta?.addKeyframes ||
        meta?.addContainer
      ) {
        throw new DownwindError(
          `Complex utils like "${token}" are not supported.${
            hasMedia && from === "CSS"
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

  const preTransform = (content: string) => {
    let invalidateUtils = false;
    const hasApply = content.includes("@apply ");
    if (hasApply) {
      content = content.replace(
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
      content = content.replace(screenRE, (substring, value: string) => {
        const variant = variantsMap.get(value);
        if (variant === undefined) {
          throw new DownwindError(`No variant matching "${value}"`, substring);
        }
        if (!variant.media) {
          throw new DownwindError(
            `"${value}" is not a media variant`,
            substring,
          );
        }
        return variant.media;
      });
    }

    const hasTheme = content.includes('theme("');
    if (hasTheme) {
      content = content.replace(themeRE, (_, path: string) => {
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

    return { content, invalidateUtils };
  };

  for (const token of config.safelist) {
    const match = parse(token);
    if (!match) {
      throw new Error(`downwind: No rule matching "${token}" in safelist`);
    }
    addMatch(match);
  }

  return {
    getBase: () => getBase(config.theme),
    preTransform,
    transform: <AnalyzeDependencies extends boolean>(
      path: string,
      opts?: { analyzeDependencies: AnalyzeDependencies },
    ) => {
      const { content, invalidateUtils } = preTransform(
        readFileSync(path, "utf-8"),
      );
      const result = transform({
        filename: relative(root, path),
        code: Buffer.from(content),
        analyzeDependencies: opts?.analyzeDependencies,
        cssModules: path.endsWith(".module.css"),
        drafts: { nesting: true },
        targets,
      });
      return {
        invalidateUtils,
        code: result.code.toString(),
        exports: result.exports
          ? // https://github.com/parcel-bundler/lightningcss/issues/291
            Object.fromEntries(
              Object.entries(result.exports).sort((a, b) =>
                a[0].localeCompare(b[0]),
              ),
            )
          : undefined,
        dependencies: result.dependencies as AnalyzeDependencies extends true
          ? Dependency[]
          : never,
      };
    },
    scan: (
      path: string,
      code = readFileSync(path, "utf-8"),
    ): boolean /* hasNew */ => {
      const shouldScan =
        path.endsWith(scannedExtension) || code.includes("@downwind-scan");
      if (!shouldScan) return false;
      const tokens = code
        .split(/[\s'"`;=]+/g)
        .filter((t) => validSelectorRE.test(t) && !blockList.has(t));
      let hasNew = false;
      for (const token of tokens) {
        const match = parse(token);
        if (match && addMatch(match)) hasNew = true;
      }
      return hasNew;
    },
    generate: (opts?: { skipLightningCSS?: boolean }) => {
      let useContainer = false;
      let utilsOutput = "";
      allMatches.forEach((matches, screen) => {
        if (!matches.length && !useContainer) return;
        if (screen) {
          const { min, max } = config.theme.screens[screen]!;
          if (useContainer && min && max !== undefined) {
            // If max is defined, we need to use a separate media query
            const declaration = printScreenContainer(config, screen, min);
            utilsOutput += `\n@media (min-width: ${min}) {\n${declaration}\n}`;
            // Avoid empty "default" media query
            if (!matches.length) return;
          }
          utilsOutput += `\n@media ${variantsMap.get(screen)!.media!} {\n`;
          if (useContainer && min && max === undefined) {
            const declaration = printScreenContainer(config, screen, min);
            utilsOutput += `${declaration}\n`;
          }
        }
        for (const match of matches.sort((a, b) => getOrder(a) - getOrder(b))) {
          const meta =
            match.type === "Rule"
              ? getRuleMeta(match.ruleEntry.rule)
              : undefined;
          if (meta?.addContainer) {
            if (!screen) {
              useContainer = true;
              utilsOutput += printContainerClass(config.theme.container);
            }
            continue;
          }
          let mediaWrapper: string | undefined;
          let selector = escapeSelector(match.token);
          selector = applyVariants(selector, match.variants, meta, (media) => {
            mediaWrapper = mediaWrapper
              ? `${media} and ${mediaWrapper}`
              : media;
          });
          if (mediaWrapper) utilsOutput += `@media ${mediaWrapper} {\n`;
          utilsOutput += printBlock(
            `.${selector}`,
            match.type === "Rule"
              ? toCSS(match.ruleEntry, match.important)
              : [arbitraryPropertyMatchToLine(match)],
          );
          if (mediaWrapper) utilsOutput += "}\n";
        }
        if (screen) utilsOutput += "}\n";
      });

      let header = "";
      if (usedDefaults.size) {
        header += printBlock(
          "*, ::before, ::after, ::backdrop",
          cssEntriesToLines(
            [...usedDefaults].flatMap((d) => defaults[d]),
            false,
          ),
        );
        header += "\n";
      }
      usedKeyframes.forEach((name) => {
        header += `@keyframes ${name} {\n  ${config.theme.keyframes[
          name
        ]!}\n}\n`;
      });
      if (usedKeyframes.size) header += "\n";

      if (opts?.skipLightningCSS) return header + utilsOutput;
      return transform({
        filename: "@downwind/utils.css",
        code: Buffer.from(header + utilsOutput),
        drafts: { nesting: true },
        targets,
      }).code.toString();
    },
    codegen: ({ omitContent }: { omitContent: boolean }) => {
      if (omitContent) {
        return Array.from(rulesEntries.keys())
          .map((name) => `.${escapeSelector(name)}{}`)
          .join("\n");
      }

      return Array.from(rulesEntries.entries())
        .map(([name, ruleEntry]) => {
          const ruleMeta = getRuleMeta(ruleEntry.rule);
          if (ruleMeta?.addContainer) {
            return printContainerClass(config.theme.container);
          }
          let selector = escapeSelector(name);
          if (ruleMeta?.selectorRewrite) {
            selector = ruleMeta.selectorRewrite(selector);
          }
          return printBlock(`.${selector}`, toCSS(ruleEntry, false));
        })
        .join("");
    },
    configFiles,
  };
};

const getOrder = (match: Match) =>
  match.type === "Rule" ? match.ruleEntry.order : Infinity;

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
