import type { ResolvedConfig } from "../resolveConfig";
import type { Container, CSSEntries, RuleMeta } from "../types";
import { Variant } from "../variants";

export const escapeSelector = (selector: string) =>
  selector.replace(/[.:/[\]!#%&>+~*()]/g, (c) => `\\${c}`);

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

  return printBlock(".container", cssEntriesToLines(entries, false));
};

export const printScreenContainer = (
  config: ResolvedConfig,
  name: string,
  min: string,
): string => {
  const paddingConfig = config.theme.container.padding;
  const padding =
    typeof paddingConfig === "string" ? undefined : paddingConfig?.[name];
  return `  .container { max-width: ${min}; ${
    padding ? `padding-left: ${padding}; padding-right: ${padding}; ` : ""
  }}`;
};

export const cssEntriesToLines = (entries: CSSEntries, important: boolean) =>
  entries.map(
    (entry) => `${entry[0]}: ${entry[1]}${important ? " !important" : ""};`,
  );

export const arbitraryPropertyMatchToLine = (match: {
  content: string;
  important: boolean;
}) => `${match.content}${match.important ? " !important" : ""}`;

export const applyVariants = (
  selector: string,
  variants: Variant[],
  meta: RuleMeta | undefined,
  mediaScreen: (media: string) => void,
) => {
  for (let i = variants.length - 1; i >= 0; i--) {
    const variant = variants[i];
    if (variant.selectorRewrite) {
      selector = variant.selectorRewrite(selector);
    } else {
      mediaScreen(variant.media);
    }
  }
  if (meta?.selectorRewrite) selector = meta.selectorRewrite(selector);
  return selector;
};
