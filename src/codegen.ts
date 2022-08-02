import { getConfig } from "./getConfig";
import {
  getRuleMeta,
  getRulesEntries,
  getTokenParser,
  toCSS,
} from "./getTokenParser";
import { codegen as codegenDeclaration } from "./types";
import { escapeSelector, printBlock, printContainerClass } from "./utils/print";
import { getVariants } from "./variants";

export const codegen: typeof codegenDeclaration = async ({ omitContent }) => {
  const config = await getConfig();
  const { rulesEntries } = getRulesEntries(config);

  if (omitContent) {
    return Array.from(rulesEntries.keys())
      .map((name) => `.${escapeSelector(name)}{}`)
      .join("\n");
  }

  const variantsMap = getVariants(config);
  const tokenParser = getTokenParser({ config, variantsMap });

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
      return printBlock(`.${selector}`, toCSS(ruleEntry, tokenParser));
    })
    .join("");
};
