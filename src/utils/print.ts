import type { ResolvedConfig } from "../resolveConfig.ts";
import type { Container, CSSEntries, RuleMeta } from "../types.d.ts";
import type { Variant } from "../variants.ts";

export const printBlock = (
  selector: string,
  lines: string[],
  indentation = "",
) => {
  let output = `${indentation}${selector} {\n`;
  for (const line of lines) output += `${indentation}  ${line}\n`;
  output += `${indentation}}\n`;
  return output;
};

export const printContainerClass = (config: Container) => {
  const defaultPadding =
    typeof config.padding === "string"
      ? config.padding
      : config.padding?.["DEFAULT"];

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
) => {
  let hasAtRule = false;
  for (let i = variants.length - 1; i >= 0; i--) {
    const variant = variants[i];
    switch (variant.type) {
      case "selectorRewrite":
        selector = variant.selectorRewrite(selector);
        break;
      case "atRule":
        hasAtRule = true;
        break;
    }
  }
  if (meta?.selectorRewrite) selector = meta.selectorRewrite(selector);
  return { selector, hasAtRule };
};
