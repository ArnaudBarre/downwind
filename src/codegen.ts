#!/usr/bin/env node

import { getConfig } from "./getConfig";
import { getRules, getRulesEntries, toCSSEntries } from "./getTokenParser";
import { codegen as codegenDeclaration } from "./types";
import { escapeSelector, printBlock, printContainerClass } from "./utils/print";

export const codegen: typeof codegenDeclaration = async ({ omitContent }) => {
  const config = await getConfig();

  const rulesEntries = getRulesEntries(getRules(config));

  return omitContent
    ? Array.from(rulesEntries.keys())
        .map((name) => `.${escapeSelector(name)}{}`)
        .join("\n")
    : Array.from(rulesEntries.entries())
        .map(([name, ruleEntry]) =>
          name === "container"
            ? printContainerClass(config.theme.container)
            : printBlock(`.${escapeSelector(name)}`, toCSSEntries(ruleEntry)),
        )
        .join("");
};
