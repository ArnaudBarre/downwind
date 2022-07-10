import { readFileSync, rmSync, writeFileSync } from "fs";
import { transform as parcelTransform } from "@parcel/css";

import { cssModuleToJS, initDownwind } from "./index";
import { esbuildPlugins as esbuildPluginsDeclaration } from "./types";

const UTILS_PLACEHOLDER = ".__downwind_utils__{padding:0}";

export const esbuildPlugins: typeof esbuildPluginsDeclaration = (targets) => {
  const cssModulesMap: Record<string, string> = {};
  let hasCSSUtils = false;
  let downwind: Awaited<ReturnType<typeof initDownwind>>;
  const initPromise = initDownwind(targets).then((result) => {
    downwind = result;
  });

  return [
    {
      name: "css",
      setup: (pluginBuild) => {
        pluginBuild.onStart(() => initPromise);
        pluginBuild.onResolve({ filter: /^transpiled:/ }, ({ path }) => ({
          path: path.slice(11),
          namespace: "downwind=css-transpiled",
        }));
        pluginBuild.onLoad(
          { filter: /./, namespace: "downwind-css-transpiled" },
          ({ path }) => ({ contents: cssModulesMap[path], loader: "css" }),
        );
        pluginBuild.onLoad({ filter: /\.css$/ }, ({ path }) => {
          const { code, exports } = downwind.transform(path);
          if (!exports) return { contents: code, loader: "css" };
          cssModulesMap[path] = code;
          return {
            contents: `import "transpiled:${path}";${cssModuleToJS(exports)}`,
          };
        });
      },
    },
    {
      name: "virtual",
      setup: (pluginBuild) => {
        pluginBuild.onStart(() => initPromise);
        pluginBuild.onResolve({ filter: /^virtual:@downwind\// }, (args) => ({
          path: args.path.slice(18),
          namespace: "downwind-virtual",
        }));
        pluginBuild.onLoad(
          { filter: /./, namespace: "downwind-virtual" },
          (args) => {
            switch (args.path) {
              case "css-base":
                return { contents: downwind.getBase(), loader: "css" };
              case "css-utils":
                hasCSSUtils = true;
                return { contents: UTILS_PLACEHOLDER, loader: "css" };
              default:
                throw new Error(
                  `Unexpected virtual entry: @downwind/${args.path}`,
                );
            }
          },
        );
      },
    },
    {
      name: "css-scan",
      setup: (pluginBuild) => {
        pluginBuild.onStart(() => initPromise);
        pluginBuild.onLoad({ filter: /\.[jt]sx?$/u }, ({ path }) => {
          // https://github.com/evanw/esbuild/issues/1222
          if (path.includes("/node_modules/")) return;
          downwind.scan(path);
          return null;
        });
        pluginBuild.onEnd((result) => {
          if (!hasCSSUtils) return;
          const paths = Object.keys(result.metafile!.outputs);
          const cssPath = paths.find((p) => p.endsWith(".css"))!;
          const withUtils = readFileSync(cssPath, "utf-8").replace(
            UTILS_PLACEHOLDER,
            downwind.generate(),
          );

          writeFileSync(
            cssPath,
            parcelTransform({
              filename: "dist/assets/index.css",
              code: Buffer.from(withUtils),
              minify: true,
              targets,
            }).code,
          );
          rmSync(`${cssPath}.map`);
        });
      },
    },
  ];
};
