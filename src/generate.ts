import { ResolvedConfig } from "./getConfig";
import { Defaults } from "./getDefaults";
import { getRuleMeta, RuleMatch, toCSSEntries } from "./getTokenParser";
import { Default } from "./types";
import { escapeSelector, printBlock, printContainerClass } from "./utils/print";
import { VariantsMap } from "./variants";

export const generate = ({
  config,
  variantsMap,
  defaults,
  allMatches,
}: {
  config: ResolvedConfig;
  variantsMap: VariantsMap;
  defaults: Defaults;
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
      if (meta?.selectorRewrite) selector = meta.selectorRewrite(selector);
      for (let i = match.variants.length - 1; i >= 0; i--) {
        const variant = match.variants[i];
        if (variant.selectorRewrite) {
          selector = variant.selectorRewrite(selector);
        } else {
          mediaWrapper = mediaWrapper
            ? `${variant.media} and ${mediaWrapper}`
            : variant.media;
        }
      }
      if (mediaWrapper) {
        utilsOutput += `${screenIndent}@media ${mediaWrapper} {\n`;
      }
      utilsOutput += printBlock(
        `.${selector}`,
        toCSSEntries(match.ruleEntry),
        mediaWrapper ? `${screenIndent}  ` : screenIndent,
      );
      if (mediaWrapper) utilsOutput += `${screenIndent}}\n`;
    }
    if (screen) utilsOutput += "}\n";
  });

  if (usedDefaults.size) {
    output += printBlock(
      "*, ::before, ::after",
      [...usedDefaults].flatMap((d) => defaults[d]),
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
