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
  let addContainer = false;
  const keyframes = new Set<string>();
  const usedDefaults = new Set<Default>();
  let output = "";
  let utilsOutput = "";
  allMatches.forEach((matches, screen) => {
    if (!matches.length) return;
    if (screen) {
      utilsOutput += `\n@media ${variantsMap.get(screen)!.media!} {\n`;
    }
    for (const match of matches.sort(
      (a, b) => a.ruleEntry.order - b.ruleEntry.order,
    )) {
      const meta = getRuleMeta(match.ruleEntry.rule);
      if (meta?.addContainer) {
        addContainer = true;
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
          if (mediaWrapper) mediaWrapper += ` and ${variant.media}`;
          else mediaWrapper = variant.media;
        }
      }
      if (mediaWrapper) utilsOutput += `@media ${mediaWrapper} {\n`;
      utilsOutput += printBlock(`.${selector}`, toCSSEntries(match.ruleEntry));
      if (mediaWrapper) utilsOutput += "}\n";
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
  // Issue with TS flow control
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (addContainer) output += printContainer(config);

  return output + utilsOutput;
};

const printContainer = (config: ResolvedConfig): string => {
  const paddingConfig = config.theme.container.padding;
  let output = `${printContainerClass(config.theme.container)}\n`;
  for (const name in config.theme.screens) {
    const { min } = config.theme.screens[name]!;
    if (!min) continue;
    const padding =
      typeof paddingConfig === "string" ? undefined : paddingConfig?.[name];
    output += `@media (min-width: ${min}) {
  .container { max-width: ${min}; ${
      padding ? `padding-left: ${padding}; padding-right: ${padding}; ` : ""
    }}\n}\n`;
  }
  return `${output}\n`;
};
