import { type BaseRuleOrBaseRules, getCoreRules } from "./coreRules.ts";
import { getRuleMeta } from "./getEntries.ts";
import type { ResolvedConfig } from "./resolveConfig.ts";
import type { BaseRule, CoreRule } from "./types.d.ts";
import { split } from "./utils/helpers.ts";

export type Shortcut = [string, string];
export type Rule = BaseRule | Shortcut;

export const getRules = (config: ResolvedConfig): Rule[] => {
  const coreRules = getCoreRules(config);
  const enabledCoreRules: BaseRule[] = [];
  const isBaseRules = (v: BaseRuleOrBaseRules): v is BaseRule[] =>
    Array.isArray(v[0]);
  for (const coreRule in coreRules) {
    if (config.coreRules[coreRule as CoreRule] !== false) {
      const value = coreRules[coreRule as CoreRule];
      enabledCoreRules.push(...(isBaseRules(value) ? value : [value]));
    }
  }
  const shortcuts: Rule[] = Object.entries(config.shortcuts);
  const [before, after] = split(
    config.rules,
    (r) => getRuleMeta(r)?.injectFirst ?? false,
  );
  return shortcuts.concat(before, enabledCoreRules, after);
};
