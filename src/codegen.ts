import { getConfig } from "./getConfig";
import {
  getRuleMeta,
  getRules,
  getRulesEntries,
  toCSSEntries,
} from "./getTokenParser";
import { codegen as codegenDeclaration } from "./types";
import { escapeSelector, printBlock, printContainerClass } from "./utils/print";

export const codegen: typeof codegenDeclaration = async ({ omitContent }) => {
  const config = await getConfig();

  const { rulesEntries } = getRulesEntries(getRules(config));

  return omitContent
    ? Array.from(rulesEntries.keys())
        .map((name) => `.${escapeSelector(name)}{}`)
        .join("\n")
    : Array.from(rulesEntries.entries())
        .map(([name, ruleEntry]) => {
          const ruleMeta = getRuleMeta(ruleEntry.rule);
          if (ruleMeta?.addContainer) {
            return printContainerClass(config.theme.container);
          }
          let selector = escapeSelector(name);
          if (ruleMeta?.selectorRewrite) {
            selector = ruleMeta.selectorRewrite(selector);
          }
          return printBlock(`.${selector}`, toCSSEntries(ruleEntry));
        })
        .join("");
};
