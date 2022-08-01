import { readFileSync } from "fs";
import {
  CSSModuleExports,
  Dependency,
  transform,
  TransformOptions,
} from "@parcel/css";

import { getBase } from "./base/getBase";
import { generate } from "./generate";
import { getConfig } from "./getConfig";
import { getDefaults } from "./getDefaults";
import { getScan } from "./getScan";
import { getTokenParser, RuleMatch } from "./getTokenParser";
import { preTransform } from "./preTransform";
import { initDownwind as initDownwindDeclaration } from "./types";
import { getVariants } from "./variants";

export const VERSION = __VERSION__;
export { codegen } from "./codegen";
export { cssModuleToJS } from "./utils/modules";
export { esbuildPlugin } from "./esbuildPlugin";
export { vitePlugin } from "./vitePlugin";

export const initDownwind: typeof initDownwindDeclaration = async (
  targets?: TransformOptions["targets"],
) => {
  const config = await getConfig();
  const defaults = getDefaults(config);
  const variantsMap = getVariants(config);
  const tokenParser = getTokenParser({ config, variantsMap });
  const allMatches = new Map<string, RuleMatch[]>([
    ["", [] as RuleMatch[]],
    ...Object.keys(config.theme.screens).map(
      (screen): [string, RuleMatch[]] => [screen, []],
    ),
  ]);

  const pt = (content: string) =>
    preTransform({ content, tokenParser, variantsMap });

  return {
    getBase: () => getBase(config.theme),
    preTransform: pt,
    transform: <AnalyzeDependencies extends boolean>(
      path: string,
      opts?: { analyzeDependencies: AnalyzeDependencies },
    ) => {
      const result = transform({
        filename: path,
        code: Buffer.from(pt(readFileSync(path, "utf-8"))),
        analyzeDependencies: opts?.analyzeDependencies,
        cssModules: path.endsWith(".module.css"),
        drafts: { nesting: true },
        targets,
      });
      return {
        code: result.code.toString(),
        exports: result.exports as CSSModuleExports | undefined,
        dependencies: result.dependencies as AnalyzeDependencies extends true
          ? Dependency[]
          : never,
      };
    },
    generate: () => generate({ config, variantsMap, defaults, allMatches }),
    scan: getScan({ tokenParser, allMatches }),
  };
};
