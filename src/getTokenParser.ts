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
import { split } from "./utils/helpers";
import { Variant, VariantsMap } from "./variants";

export type RuleMatch = {
  token: string;
  ruleEntry: RuleEntry;
  variants: Variant[];
  screen: string;
};
export type RuleEntry = {
  rule: Rule;
  key: string;
  direction: string;
  negative: boolean;
  order: number;
};
export type TokenParser = (token: string) => RuleMatch | undefined;

export const getTokenParser = ({
  config,
  variantsMap,
}: {
  config: ResolvedConfig;
  variantsMap: VariantsMap;
}): TokenParser => {
  const rulesEntries = getRulesEntries(getRules(config));
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
    const ruleEntry = rulesEntries.get(token);
    return ruleEntry
      ? { token: initialToken, ruleEntry, variants, screen }
      : undefined;
  };
};

export const getRulesEntries = (rules: Rule[]): Map<string, RuleEntry> => {
  const rulesEntries = new Map<string, RuleEntry>();
  let order = 0;
  const allowNegativeRE = /^[1-9]|^0\./;
  const addTheme = (
    rule: Rule,
    prefix: string,
    themeMap: Record<string, unknown>,
    direction: string,
    meta: ThemeRuleMeta | undefined,
  ) => {
    const addThemeEntry = (
      fullPrefix: string,
      key: string,
      negative: boolean,
    ) => {
      if (key === "DEFAULT") {
        if (meta?.filterDefault) return;
        rulesEntries.set(fullPrefix, {
          rule,
          key,
          direction,
          negative,
          order: order++,
        });
      } else {
        rulesEntries.set(`${fullPrefix}-${key}`, {
          rule,
          key,
          direction,
          negative,
          order: order++,
        });
      }
    };

    if (meta?.supportsNegativeValues) {
      const negativePrefix = `-${prefix}`;
      for (const themeKey in themeMap) {
        if (allowNegativeRE.test(themeMap[themeKey] as string)) {
          addThemeEntry(negativePrefix, themeKey, true);
        }
      }
    }
    for (const themeKey in themeMap) {
      addThemeEntry(prefix, themeKey, false);
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
      });
    }
  }

  if (rulesEntries.size !== order) {
    console.warn(`Collision happened for ${order - rulesEntries.size} rule(s)`);
  }

  return rulesEntries;
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
  const [components, utils] = split(
    config.plugins,
    (r) => getRuleMeta(r)?.components ?? false,
  );
  return components.concat(coreRules, utils);
};

export const toCSSEntries = (ruleEntry: RuleEntry): CSSEntries => {
  const rule = ruleEntry.rule;
  if (isThemeRule(rule)) {
    return rule[2](
      ruleEntry.negative
        ? `-${(rule[1] as Record<string, string>)[ruleEntry.key]}`
        : rule[1][ruleEntry.key]!,
    );
  } else if (isDirectionRule(rule)) {
    return rule[3](
      ruleEntry.direction,
      ruleEntry.negative
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
