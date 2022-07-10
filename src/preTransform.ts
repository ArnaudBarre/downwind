import { readFileSync } from "fs";

import { getRuleMeta, toCSSEntries, TokenParser } from "./getTokenParser";
import { VariantsMap } from "./variants";

const applyRE = /\s@apply ([^;}\n]+)[;}\n]/g;
const screenRE = /@screen ([^{]+){/g;

export const preTransform = ({
  path,
  tokenParser,
  variantsMap,
}: {
  path: string;
  tokenParser: TokenParser;
  variantsMap: VariantsMap;
}) => {
  let content = readFileSync(path, "utf-8");
  const hasApply = content.includes("@apply ");
  if (hasApply) {
    content = content.replace(applyRE, (substring, utils: string) => {
      let output = "";
      for (const token of utils.split(" ")) {
        if (!token) continue;
        const match = tokenParser(token);
        if (match === undefined) {
          throw new DownwindError(`No rules matching "${token}"`, substring);
        }
        const meta = getRuleMeta(match.ruleEntry.rule);
        if (
          match.screen || // TODO: Find a way to make it working
          match.variants.length || // TODO: Use nesting if not media query
          meta?.selectorRewrite || // TODO: Use nesting
          meta?.addDefault || // TODO: Maybe it works if added in main
          meta?.addKeyframes || // TODO: Maybe it works if added in main
          meta?.addContainer
        ) {
          throw new DownwindError(
            `Complex utils like "${token}" are not supported. You can use @screen for media variants.`,
            substring,
          );
        }
        for (const cssEntry of toCSSEntries(match.ruleEntry)) {
          output += `${cssEntry[0]}:${cssEntry[1]};`;
        }
      }
      return `${substring[0]}${output.slice(0, -1)}${substring.at(-1)!}`;
    });
  }

  const hasScreen = content.includes("@screen ");
  if (hasScreen) {
    content = content.replace(screenRE, (substring, rawValue: string) => {
      const value = rawValue.trim();
      const variant = variantsMap.get(value);
      if (variant === undefined) {
        throw new DownwindError(`No variant matching "${value}"`, substring);
      }
      if (!variant.media) {
        throw new DownwindError(
          `"${value}" is not a screen variant`,
          substring,
        );
      }
      return `@media ${variant.media} {`;
    });
  }

  return content;
};

export class DownwindError extends Error {
  context: string;

  constructor(message: string, content: string) {
    super(message);
    this.name = this.constructor.name;
    this.context = content;
  }
}
