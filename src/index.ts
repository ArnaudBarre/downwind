import { readFileSync } from "fs";
import { loadConfig } from "@arnaud-barre/config-loader";
import {
  CSSModuleExports,
  Dependency,
  transform,
  TransformOptions,
} from "@parcel/css";

import { getBase } from "./base/getBase";
import { getDefaults } from "./getDefaults";
import {
  getRuleMeta,
  getEntries,
  isDirectionRule,
  isShortcut,
  isThemeRule,
  RuleEntry,
  RuleMatch,
} from "./getEntries";
import { resolveConfig } from "./resolveConfig";
import {
  CSSEntries,
  Default,
  initDownwind as initDownwindDeclaration,
  UserConfig,
} from "./types";
import { isColor } from "./utils/colors";
import { run } from "./utils/helpers";
import {
  applyVariants,
  cssEntriesToLines,
  escapeSelector,
  printBlock,
  printContainerClass,
  printScreenContainer,
} from "./utils/print";
import { getVariants, Variant } from "./variants";

export const VERSION = __VERSION__;
export { cssModuleToJS } from "./utils/modules";
export { convertTargets } from "./utils/convertTargets";

const arbitraryValueRE = /-\[.*]$/;
const applyRE = /[{\s]@apply ([^;}\n]+)([;}\n])/g;
const screenRE = /@screen ([^{]+){/g;
const validSelectorRE = /^[a-z0-9.:/_[\]#-]+$/;

export const initDownwind: typeof initDownwindDeclaration = async (opts?: {
  targets?: TransformOptions["targets"];
}) =>
  initDownwindWithConfig({
    config:
      globalThis.TEST_CONFIG ?? (await loadConfig<UserConfig>("downwind")),
    ...opts,
  });

export const initDownwindWithConfig = ({
  config: userConfig,
  targets,
}: {
  config: UserConfig | undefined;
  targets?: TransformOptions["targets"];
}) => {
  const config = resolveConfig(userConfig);
  const defaults = getDefaults(config);
  const variantsMap = getVariants(config);
  const { rulesEntries, arbitraryEntries } = getEntries(config);
  const blockList = new Set<string>();

  const allMatches = new Map<string, RuleMatch[]>([
    ["", [] as RuleMatch[]],
    ...Object.keys(config.theme.screens).map(
      (screen): [string, RuleMatch[]] => [screen, []],
    ),
  ]);
  const allClasses = new Set<string>();
  const addMatch = (match: RuleMatch): boolean /* isNew */ => {
    if (allClasses.has(match.token)) return false;
    allClasses.add(match.token);
    allMatches.get(match.screen)!.push(match);
    return true;
  };

  type ParseResult = {
    token: string;
    ruleEntry: RuleEntry;
    variants: Variant[];
    screen: string;
  };
  const parseCache = new Map<string, ParseResult>();
  const parse = (token: string): ParseResult | undefined => {
    if (blockList.has(token)) return;
    const cachedValue = parseCache.get(token);
    if (cachedValue) return cachedValue;

    const initialToken = token;
    let index: number;
    let screen = "";
    const variants: Variant[] = [];
    while ((index = token.indexOf(":")) !== -1) {
      const prefix = token.slice(0, index);
      const variant = variantsMap.get(prefix);
      if (!variant) {
        blockList.add(token);
        return;
      }
      if (variant.screen) screen = variant.screen;
      else variants.push(variant);
      token = token.slice(index + 1);
    }
    let ruleEntry = rulesEntries.get(token);
    if (!ruleEntry) {
      const start = token.indexOf("[");
      if (start !== -1 && arbitraryValueRE.test(token)) {
        const prefix = token.slice(0, start - 1);
        const entries = arbitraryEntries.get(prefix);
        if (entries) {
          const value = token.slice(start + 1, -1);
          const entry =
            entries.length > 1
              ? entries.find((e) =>
                  e.validation === "color" ? isColor(value) : true,
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

    if (!ruleEntry) {
      blockList.add(token);
      return;
    }
    const result: ParseResult = {
      token: initialToken,
      ruleEntry,
      variants,
      screen,
    };
    parseCache.set(token, result);
    return result;
  };

  const toCSS = (ruleEntry: RuleEntry): string[] => {
    const rule = ruleEntry.rule;

    if (isShortcut(rule)) {
      return apply({
        tokens: rule[1],
        context: `"${rule[0]}": "${rule[1]}"`,
        from: "SHORTCUT",
      });
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

    return cssEntriesToLines(cssEntries);
  };

  const apply = ({
    tokens,
    context,
    from,
  }: {
    tokens: string;
    context: string;
    from: "CSS" | "SHORTCUT";
  }): string[] => {
    const output = [];
    for (const token of tokens.split(" ")) {
      if (!token) continue;
      const match = parse(token);
      if (!match) {
        throw new DownwindError(`No rule matching "${token}"`, context);
      }
      const meta = getRuleMeta(match.ruleEntry.rule);
      let hasMedia = !!match.screen;
      const selector = applyVariants("&", match, meta, () => {
        hasMedia = true;
      });
      if (
        hasMedia ||
        !selector.startsWith("&") ||
        meta?.addDefault || // TODO: Maybe it works if added in main
        meta?.addKeyframes || // TODO: Maybe it works if added in main
        meta?.addContainer
      ) {
        throw new DownwindError(
          `Complex utils like "${token}" are not supported.${
            hasMedia && from === "CSS"
              ? " You can use @screen for media variants."
              : ""
          }`,
          context,
        );
      }
      const tokenOutput = toCSS(match.ruleEntry).join(" ");
      output.push(
        selector === "&" ? tokenOutput : `${selector} { ${tokenOutput} }`,
      );
    }
    return output;
  };

  const preTransform = (content: string) => {
    const hasApply = content.includes("@apply ");
    if (hasApply) {
      content = content.replace(
        applyRE,
        (substring, tokens: string, endChar: string) => {
          const output = apply({
            tokens,
            context: substring,
            from: "CSS",
          });
          return `${substring[0]}${output.join("\n  ")}${
            endChar === ";" ? "" : endChar
          }`;
        },
      );
    }

    const hasScreen = content.includes("@screen ");
    if (hasScreen) {
      content = content.replace(screenRE, (substring, rawValue: string) => {
        const value = rawValue.trim();
        const variant = variantsMap.get(value);
        if (variant === undefined) {
          throw new DownwindError(`No variant matching "${value}"`, substring);
        }
        if (!variant.media) {
          throw new DownwindError(
            `"${value}" is not a screen variant`,
            substring,
          );
        }
        return `@media ${variant.media} {`;
      });
    }

    return content;
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
      const result = transform({
        filename: path,
        code: Buffer.from(preTransform(readFileSync(path, "utf-8"))),
        analyzeDependencies: opts?.analyzeDependencies,
        cssModules: path.endsWith(".module.css"),
        drafts: { nesting: true },
        targets,
      });
      return {
        code: result.code.toString(),
        exports: result.exports as CSSModuleExports | undefined,
        dependencies: result.dependencies as AnalyzeDependencies extends true
          ? Dependency[]
          : never,
      };
    },
    scan: (
      path: string,
      code = readFileSync(path, "utf-8"),
    ): boolean /* hasNew */ => {
      const shouldScan = run(() => {
        if (path.endsWith("x")) return true;
        return code.includes("@css-scan");
      });
      if (!shouldScan) return false;
      const tokens = code
        .split(/[\s'"`;>=]+/g)
        .filter((t) => validSelectorRE.test(t) && !blockList.has(t));
      let hasNew = false;
      for (const token of tokens) {
        const match = parse(token);
        if (match && addMatch(match)) hasNew = true;
      }
      return hasNew;
    },
    generate: () => {
      let useContainer = false;
      const keyframes = new Set<string>();
      const usedDefaults = new Set<Default>();
      let output = "";
      let utilsOutput = "";
      allMatches.forEach((matches, screen) => {
        if (!matches.length && !useContainer) return;
        const screenIndent = screen ? "  " : "";
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
        for (const match of matches.sort(
          (a, b) => a.ruleEntry.order - b.ruleEntry.order,
        )) {
          const meta = getRuleMeta(match.ruleEntry.rule);
          if (meta?.addContainer) {
            if (!screen) {
              useContainer = true;
              utilsOutput += printContainerClass(config.theme.container);
            }
            continue;
          }
          if (meta?.addDefault) usedDefaults.add(meta.addDefault);
          if (meta?.addKeyframes) {
            const animationProperty =
              config.theme.animation[match.ruleEntry.key]!;
            const name = animationProperty.slice(
              0,
              animationProperty.indexOf(" "),
            );
            if (config.theme.keyframes[name]) keyframes.add(name);
          }
          let mediaWrapper: string | undefined;
          let selector = escapeSelector(match.token);
          selector = applyVariants(selector, match, meta, (media) => {
            mediaWrapper = mediaWrapper
              ? `${media} and ${mediaWrapper}`
              : media;
          });
          if (mediaWrapper) {
            utilsOutput += `${screenIndent}@media ${mediaWrapper} {\n`;
          }
          utilsOutput += printBlock(
            `.${selector}`,
            toCSS(match.ruleEntry),
            mediaWrapper ? `${screenIndent}  ` : screenIndent,
          );
          if (mediaWrapper) utilsOutput += `${screenIndent}}\n`;
        }
        if (screen) utilsOutput += "}\n";
      });

      if (usedDefaults.size) {
        output += printBlock(
          "*, ::before, ::after",
          cssEntriesToLines([...usedDefaults].flatMap((d) => defaults[d])),
        );
        output += "\n";
      }
      keyframes.forEach((name) => {
        output += `@keyframes ${name} {\n  ${config.theme.keyframes[
          name
        ]!}\n}\n`;
      });
      if (keyframes.size) output += "\n";

      return output + utilsOutput;
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
          return printBlock(`.${selector}`, toCSS(ruleEntry));
        })
        .join("");
    },
  };
};

export class DownwindError extends Error {
  context: string;

  constructor(message: string, content: string) {
    super(message);
    this.name = this.constructor.name;
    this.context = content;
  }
}
