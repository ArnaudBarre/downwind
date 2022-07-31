import { Container, CSSEntries } from "../types";

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
