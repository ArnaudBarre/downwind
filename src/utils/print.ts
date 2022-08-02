import { RuleMatch } from "../getTokenParser";
import { Container, CSSEntries, RuleMeta } from "../types";

export const escapeSelector = (selector: string) =>
  selector.replace(/[.:/[\]]/g, (c) => `\\${c}`);

export const printBlock = (selector: string, lines: string[], indent = "") => {
  let output = `${indent}${selector} {\n`;
  for (const line of lines) output += `${indent}  ${line}\n`;
  output += `${indent}}\n`;
  return output;
};

export const printContainerClass = (config: Container) => {
  const defaultPadding =
    typeof config.padding === "string"
      ? config.padding
      : config.padding?.DEFAULT;

  const entries: CSSEntries = [["width", "100%"]];
  if (config.center) {
    entries.push(["margin-left", "auto"]);
    entries.push(["margin-right", "auto"]);
  }
  if (defaultPadding) {
    entries.push(["padding-left", defaultPadding]);
    entries.push(["padding-right", defaultPadding]);
  }

  return printBlock(".container", cssEntriesToLines(entries));
};

export const cssEntriesToLines = (entries: CSSEntries) =>
  entries.map((entry) => `${entry[0]}: ${entry[1]};`);

export const applyVariants = (
  selector: string,
  match: RuleMatch,
  meta: RuleMeta | undefined,
  mediaScreen: (media: string) => void,
) => {
  for (let i = match.variants.length - 1; i >= 0; i--) {
    const variant = match.variants[i];
    if (variant.selectorRewrite) {
      selector = variant.selectorRewrite(selector);
    } else {
      mediaScreen(variant.media);
    }
  }
  if (meta?.selectorRewrite) selector = meta.selectorRewrite(selector);
  return selector;
};
