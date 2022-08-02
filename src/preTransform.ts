import { getRuleMeta, toCSSEntries, TokenParser } from "./getTokenParser";
import { applyVariants } from "./utils/print";
import { VariantsMap } from "./variants";

const applyRE = /[{\s]@apply ([^;}\n]+)([;}\n])/g;
const screenRE = /@screen ([^{]+){/g;

export const preTransform = ({
  content,
  tokenParser,
  variantsMap,
}: {
  content: string;
  tokenParser: TokenParser;
  variantsMap: VariantsMap;
}) => {
  const hasApply = content.includes("@apply ");
  if (hasApply) {
    content = content.replace(
      applyRE,
      (substring, utils: string, endChar: string) => {
        const output = [];
        for (const token of utils.split(" ")) {
          if (!token) continue;
          const match = tokenParser(token);
          if (match === undefined) {
            throw new DownwindError(`No rules matching "${token}"`, substring);
          }
          const meta = getRuleMeta(match.ruleEntry.rule);
          let hasMedia = !!match.screen;
          const selector = applyVariants("&", match, meta, () => {
            hasMedia = true;
          });
          if (
            hasMedia ||
            !selector.startsWith("&") ||
            meta?.addDefault || // TODO: Maybe it works if added in main
            meta?.addKeyframes || // TODO: Maybe it works if added in main
            meta?.addContainer
          ) {
            throw new DownwindError(
              `Complex utils like "${token}" are not supported.${
                hasMedia ? " You can use @screen for media variants." : ""
              }`,
              substring,
            );
          }
          const tokenOutput = toCSSEntries(match.ruleEntry)
            .map((cssEntry) => `${cssEntry[0]}: ${cssEntry[1]};`)
            .join(" ");

          output.push(
            selector === "&" ? tokenOutput : `${selector} { ${tokenOutput} }`,
          );
        }
        return `${substring[0]}${output.join("\n  ")}${
          endChar === ";" ? "" : endChar
        }`;
      },
    );
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
