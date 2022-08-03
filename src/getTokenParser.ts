import { BaseRuleOrBaseRules, getCorePlugins } from "./corePlugins";
import { ResolvedConfig } from "./getConfig";
import {
  BaseRule,
  CorePlugin,
  CSSEntries,
  DirectionThemeRule,
  RuleMeta,
  ThemeRule,
  ThemeRuleMeta,
} from "./types";
import { isColor } from "./utils/colors";
import { split } from "./utils/helpers";
import { applyVariants, cssEntriesToLines } from "./utils/print";
import { Variant, VariantsMap } from "./variants";

type Shortcut = [string, string];
type Rule = BaseRule | Shortcut;
type AnyThemeRule = ThemeRule<any> | DirectionThemeRule;
export type RuleMatch = {
  token: string;
  ruleEntry: RuleEntry;
  variants: Variant[];
  screen: string;
};
type RuleEntry = {
  rule: Rule;
  key: string; // "" for static rules & shortcuts, the theme key for theme rules or the actual values for arbitrary entries
  direction: string;
  negative: boolean;
  order: number;
  isArbitrary: boolean;
};
type ArbitraryEntry = {
  rule: AnyThemeRule;
  direction: string;
  validation: "color" | undefined;
  order: number;
};
export type TokenParser = (token: string) => RuleMatch | undefined;

const allowNegativeRE = /^[1-9]|^0\./;
const arbitraryValueRE = /-\[.*]$/;

export const getTokenParser = ({
  config,
  variantsMap,
}: {
  config: ResolvedConfig;
  variantsMap: VariantsMap;
}): TokenParser => {
  const { rulesEntries, arbitraryEntries } = getRulesEntries(config);
  return (token) => {
    const initialToken = token;
    let index: number;
    let screen = "";
    const variants: Variant[] = [];
    while ((index = token.indexOf(":")) !== -1) {
      const prefix = token.slice(0, index);
      const variant = variantsMap.get(prefix);
      if (!variant) return;
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
    return ruleEntry
      ? { token: initialToken, ruleEntry, variants, screen }
      : undefined;
  };
};

export const getRulesEntries = (config: ResolvedConfig) => {
  const rules = getRules(config);
  const rulesEntries = new Map<string, RuleEntry>();
  const arbitraryEntries = new Map<string, ArbitraryEntry[]>();
  let order = 0;
  let nbArbitraryRules = 0;

  const addThemeEntry = (
    rule: AnyThemeRule,
    prefix: string,
    key: string,
    direction: string,
    negative: boolean,
    meta: ThemeRuleMeta | undefined,
  ) => {
    if (key === "DEFAULT") {
      if (meta?.filterDefault) return;
      rulesEntries.set(prefix, {
        rule,
        key,
        direction,
        negative,
        order: order++,
        isArbitrary: false,
      });
    } else {
      rulesEntries.set(`${prefix}-${key}`, {
        rule,
        key,
        direction,
        negative,
        order: order++,
        isArbitrary: false,
      });
    }
  };

  const addTheme = (
    rule: AnyThemeRule,
    prefix: string,
    themeMap: Record<string, unknown>,
    direction: string,
    meta: ThemeRuleMeta | undefined,
  ) => {
    if (meta?.supportsNegativeValues) {
      const negativePrefix = `-${prefix}`;
      for (const themeKey in themeMap) {
        if (allowNegativeRE.test(themeMap[themeKey] as string)) {
          addThemeEntry(rule, negativePrefix, themeKey, direction, true, meta);
        }
      }
    }
    for (const themeKey in themeMap) {
      addThemeEntry(rule, prefix, themeKey, direction, false, meta);
    }

    const validation = meta?.arbitrary;
    if (validation !== null) {
      const entry = { rule, direction, validation, order: order++ };
      nbArbitraryRules++;
      const current = arbitraryEntries.get(prefix);
      if (current) {
        validation === "color" ? current.unshift(entry) : current.push(entry);
      } else {
        arbitraryEntries.set(prefix, [entry]);
      }
    }
  };

  for (const rule of rules) {
    if (isThemeRule(rule)) {
      addTheme(rule, rule[0], rule[1], "", rule[3]);
    } else if (isDirectionRule(rule)) {
      if (!rule[4]?.mandatory) addTheme(rule, rule[0], rule[2], "all", rule[4]);
      const omitHyphen = rule[4]?.omitHyphen;
      for (const direction of rule[1]) {
        const prefix = `${rule[0]}${omitHyphen ? "" : "-"}${direction}`;
        addTheme(rule, prefix, rule[2], direction, rule[4]);
      }
    } else {
      // Static or shortcut
      rulesEntries.set(rule[0], {
        rule,
        key: "",
        direction: "",
        negative: false,
        order: order++,
        isArbitrary: false,
      });
    }
  }

  const expectedNbRulesEntries = order - nbArbitraryRules;
  if (rulesEntries.size !== expectedNbRulesEntries) {
    console.warn(
      `Collision happened for ${
        expectedNbRulesEntries - rulesEntries.size
      } rule(s)`,
    );
  }

  for (const [prefix, entries] of arbitraryEntries.entries()) {
    if (entries.length === 1) continue;
    if (entries.length > 2) {
      console.warn(
        `Unsupported: ${entries.length} rules are using arbitrary values with the prefix "${prefix}"`,
      );
    }
    if (entries[0].validation !== "color") {
      console.warn(
        `Unsupported: 2 rules are using arbitrary values with the prefix "${prefix}" but none is scoped to "color"`,
      );
    }
  }

  return { rulesEntries, arbitraryEntries };
};

const getRules = (config: ResolvedConfig): Rule[] => {
  const corePlugins = getCorePlugins(config);
  const coreRules: BaseRule[] = [];
  const isBaseRules = (v: BaseRuleOrBaseRules): v is BaseRule[] =>
    Array.isArray(v[0]);
  for (const corePlugin in corePlugins) {
    if (config.corePlugins[corePlugin as CorePlugin] !== false) {
      const value = corePlugins[corePlugin as CorePlugin];
      coreRules.push(...(isBaseRules(value) ? value : [value]));
    }
  }
  const shortcuts: Rule[] = Object.entries(config.shortcuts);
  const [before, after] = split(
    config.plugins,
    (r) => getRuleMeta(r)?.injectFirst ?? false,
  );
  return shortcuts.concat(before, coreRules, after);
};

export const toCSS = (
  ruleEntry: RuleEntry,
  tokenParser: TokenParser,
): string[] => {
  const rule = ruleEntry.rule;

  if (isShortcut(rule)) {
    return apply({
      tokens: rule[1],
      tokenParser,
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

export const apply = ({
  tokens,
  tokenParser,
  context,
  from,
}: {
  tokens: string;
  context: string;
  tokenParser: TokenParser;
  from: "CSS" | "SHORTCUT";
}): string[] => {
  const output = [];
  for (const token of tokens.split(" ")) {
    if (!token) continue;
    const match = tokenParser(token);
    if (match === undefined) {
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
    const tokenOutput = toCSS(match.ruleEntry, tokenParser).join(" ");
    output.push(
      selector === "&" ? tokenOutput : `${selector} { ${tokenOutput} }`,
    );
  }
  return output;
};

export class DownwindError extends Error {
  context: string;

  constructor(message: string, content: string) {
    super(message);
    this.name = this.constructor.name;
    this.context = content;
  }
}

export const getRuleMeta = (rule: Rule): RuleMeta | undefined =>
  isThemeRule(rule)
    ? rule[3]
    : isDirectionRule(rule)
    ? rule[4]
    : isShortcut(rule)
    ? undefined
    : rule[2];
const isThemeRule = (rule: Rule): rule is ThemeRule<any> =>
  typeof rule[2] === "function";
const isDirectionRule = (rule: Rule): rule is DirectionThemeRule =>
  typeof rule[3] === "function";
const isShortcut = (rule: Rule): rule is Shortcut =>
  typeof rule[1] === "string";
