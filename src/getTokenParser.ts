import { getCorePlugins, RuleOrRules } from "./corePlugins";
import { ResolvedConfig } from "./getConfig";
import {
  CorePlugin,
  CSSEntries,
  DirectionThemeRule,
  Rule,
  RuleMeta,
  ThemeRule,
  ThemeRuleMeta,
} from "./types";
import { isColor } from "./utils/colors";
import { split } from "./utils/helpers";
import { Variant, VariantsMap } from "./variants";

export type RuleMatch = {
  token: string;
  ruleEntry: RuleEntry;
  variants: Variant[];
  screen: string;
};
type RuleEntry = {
  rule: Rule;
  key: string; // "" for static rules, the theme key for theme rules or the actual values for arbitrary entries
  direction: string;
  negative: boolean;
  order: number;
  isArbitrary: boolean;
};
type ArbitraryEntry = {
  rule: Rule;
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
  const { rulesEntries, arbitraryEntries } = getRulesEntries(getRules(config));
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
            key: value,
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

export const getRulesEntries = (rules: Rule[]) => {
  const rulesEntries = new Map<string, RuleEntry>();
  const arbitraryEntries = new Map<string, ArbitraryEntry[]>();
  let order = 0;
  let nbArbitraryRules = 0;

  const addThemeEntry = (
    rule: Rule,
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
    rule: Rule,
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

export const getRules = (config: ResolvedConfig): Rule[] => {
  const corePlugins = getCorePlugins(config);
  const coreRules: Rule[] = [];
  const isRules = (v: RuleOrRules): v is Rule[] => Array.isArray(v[0]);
  for (const corePlugin in corePlugins) {
    if (config.corePlugins[corePlugin as CorePlugin] !== false) {
      const value = corePlugins[corePlugin as CorePlugin];
      coreRules.push(...(isRules(value) ? value : [value]));
    }
  }
  const [before, after] = split(
    config.plugins,
    (r) => getRuleMeta(r)?.injectFirst ?? false,
  );
  return before.concat(coreRules, after);
};

export const toCSSEntries = (ruleEntry: RuleEntry): CSSEntries => {
  const rule = ruleEntry.rule;
  if (isThemeRule(rule)) {
    return rule[2](
      ruleEntry.isArbitrary
        ? ruleEntry.key
        : ruleEntry.negative
        ? `-${(rule[1] as Record<string, string>)[ruleEntry.key]}`
        : rule[1][ruleEntry.key]!,
    );
  } else if (isDirectionRule(rule)) {
    return rule[3](
      ruleEntry.direction,
      ruleEntry.isArbitrary
        ? ruleEntry.key
        : ruleEntry.negative
        ? `-${rule[2][ruleEntry.key]!}`
        : rule[2][ruleEntry.key]!,
    );
  }
  return rule[1];
};

export const getRuleMeta = (rule: Rule): RuleMeta | undefined =>
  isThemeRule(rule) ? rule[3] : isDirectionRule(rule) ? rule[4] : rule[2];
const isThemeRule = (rule: Rule): rule is ThemeRule<any> =>
  typeof rule[2] === "function";
const isDirectionRule = (rule: Rule): rule is DirectionThemeRule =>
  typeof rule[3] === "function";
