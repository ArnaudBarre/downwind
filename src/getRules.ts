import { BaseRuleOrBaseRules, getCorePlugins } from "./corePlugins";
import { getRuleMeta } from "./getEntries";
import { ResolvedConfig } from "./resolveConfig";
import { BaseRule, CorePlugin } from "./types";
import { split } from "./utils/helpers";

export type Shortcut = [string, string];
export type Rule = BaseRule | Shortcut;

export const getRules = (config: ResolvedConfig): Rule[] => {
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
