import { apply, DownwindError, TokenParser } from "./getTokenParser";
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
      (substring, tokens: string, endChar: string) => {
        const output = apply({
          tokens,
          tokenParser,
          context: substring,
          from: "CSS",
        });
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
