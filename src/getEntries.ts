import { getRules, type Rule, type Shortcut } from "./getRules.ts";
import { type ResolvedConfig } from "./resolveConfig.ts";
import type {
  DirectionThemeRule,
  RuleMeta,
  ThemeRule,
  ThemeRuleMeta,
} from "./types.d.ts";

type AnyThemeRule = ThemeRule<any> | DirectionThemeRule;
export type RuleEntry = {
  rule: Rule;
  direction: string;
  negative: boolean;
  order: number;
} & (
  | {
      key: string; // "" for static rules & shortcuts, the theme key for theme rules
      isArbitrary: false;
    }
  | {
      value: string | string[];
      isArbitrary: true;
    }
);
type ArbitraryEntry = {
  rule: AnyThemeRule;
  direction: string;
  validation: "color-only" | undefined;
  order: number;
};

const allowNegativeRE = /^[1-9]|^0\./;

export const getEntries = (config: ResolvedConfig) => {
  const rules = getRules(config);
  const rulesEntries = new Map<string, RuleEntry & { isArbitrary: false }>();
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
        validation === "color-only"
          ? current.unshift(entry)
          : current.push(entry);
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
    if (entries[0].validation !== "color-only") {
      console.warn(
        `Unsupported: 2 rules are using arbitrary values with the prefix "${prefix}" but none is scoped to "color-only"`,
      );
    }
  }

  return { rulesEntries, arbitraryEntries };
};

export const getRuleMeta = (rule: Rule): RuleMeta | undefined =>
  isThemeRule(rule)
    ? rule[3]
    : isDirectionRule(rule)
    ? rule[4]
    : isShortcut(rule)
    ? undefined
    : rule[2];
export const isThemeRule = (rule: Rule): rule is ThemeRule<any> =>
  typeof rule[2] === "function";
export const isDirectionRule = (rule: Rule): rule is DirectionThemeRule =>
  typeof rule[3] === "function";
export const isShortcut = (rule: Rule): rule is Shortcut =>
  typeof rule[1] === "string";
