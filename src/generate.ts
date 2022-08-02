import { ResolvedConfig } from "./getConfig";
import { Defaults } from "./getDefaults";
import { getRuleMeta, RuleMatch, toCSS, TokenParser } from "./getTokenParser";
import { Default } from "./types";
import {
  applyVariants,
  cssEntriesToLines,
  escapeSelector,
  printBlock,
  printContainerClass,
} from "./utils/print";
import { VariantsMap } from "./variants";

export const generate = ({
  config,
  variantsMap,
  defaults,
  tokenParser,
  allMatches,
}: {
  config: ResolvedConfig;
  variantsMap: VariantsMap;
  defaults: Defaults;
  tokenParser: TokenParser;
  allMatches: Map<string, RuleMatch[]>;
}) => {
  let useContainer = false;
  const keyframes = new Set<string>();
  const usedDefaults = new Set<Default>();
  let output = "";
  let utilsOutput = "";
  allMatches.forEach((matches, screen) => {
    if (!matches.length && !useContainer) return;
    const screenIndent = screen ? "  " : "";
    if (screen) {
      const { min, max } = config.theme.screens[screen]!;
      if (useContainer && min && max !== undefined) {
        // If max is defined, we need to use a separate media query
        const declaration = printScreenContainer(config, screen, min);
        utilsOutput += `\n@media (min-width: ${min}) {\n${declaration}\n}`;
        // Avoid empty "default" media query
        if (!matches.length) return;
      }
      utilsOutput += `\n@media ${variantsMap.get(screen)!.media!} {\n`;
      if (useContainer && min && max === undefined) {
        const declaration = printScreenContainer(config, screen, min);
        utilsOutput += `${declaration}\n`;
      }
    }
    for (const match of matches.sort(
      (a, b) => a.ruleEntry.order - b.ruleEntry.order,
    )) {
      const meta = getRuleMeta(match.ruleEntry.rule);
      if (meta?.addContainer) {
        if (!screen) {
          useContainer = true;
          utilsOutput += printContainerClass(config.theme.container);
        }
        continue;
      }
      if (meta?.addDefault) usedDefaults.add(meta.addDefault);
      if (meta?.addKeyframes) {
        const animationProperty = config.theme.animation[match.ruleEntry.key]!;
        const name = animationProperty.slice(0, animationProperty.indexOf(" "));
        if (config.theme.keyframes[name]) keyframes.add(name);
      }
      let mediaWrapper: string | undefined;
      let selector = escapeSelector(match.token);
      selector = applyVariants(selector, match, meta, (media) => {
        mediaWrapper = mediaWrapper ? `${media} and ${mediaWrapper}` : media;
      });
      if (mediaWrapper) {
        utilsOutput += `${screenIndent}@media ${mediaWrapper} {\n`;
      }
      utilsOutput += printBlock(
        `.${selector}`,
        toCSS(match.ruleEntry, tokenParser),
        mediaWrapper ? `${screenIndent}  ` : screenIndent,
      );
      if (mediaWrapper) utilsOutput += `${screenIndent}}\n`;
    }
    if (screen) utilsOutput += "}\n";
  });

  if (usedDefaults.size) {
    output += printBlock(
      "*, ::before, ::after",
      cssEntriesToLines([...usedDefaults].flatMap((d) => defaults[d])),
    );
    output += "\n";
  }
  keyframes.forEach((name) => {
    output += `@keyframes ${name} {\n  ${config.theme.keyframes[name]!}\n}\n`;
  });
  if (keyframes.size) output += "\n";

  return output + utilsOutput;
};

const printScreenContainer = (
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
