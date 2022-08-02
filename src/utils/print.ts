import { RuleMatch } from "../getTokenParser";
import { Container, CSSEntries, RuleMeta } from "../types";

export const escapeSelector = (selector: string) =>
  selector.replace(/[.:/[\]]/g, (c) => `\\${c}`);

export const printBlock = (
  selector: string,
  entries: CSSEntries,
  indent = "",
) => {
  let output = `${indent}${selector} {\n`;
  for (const entry of entries) {
    output += `${indent}  ${entry[0]}: ${entry[1]};\n`;
  }
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

  return printBlock(".container", entries);
};

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
