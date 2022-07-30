import { readFileSync, rmSync, writeFileSync } from "fs";
import { transform as parcelTransform } from "@parcel/css";

import { cssModuleToJS, initDownwind } from "./index";
import { esbuildPlugins as esbuildPluginsDeclaration } from "./types";

export const esbuildPlugins: typeof esbuildPluginsDeclaration = (targets) => {
  const cssModulesMap: Record<string, string> = {};
  let hasCSSUtils = false;
  let downwind: Awaited<ReturnType<typeof initDownwind>>;
  const initPromise = initDownwind(targets).then((result) => {
    downwind = result;
  });
  let useMinify = false;
  const getPlaceholder = () =>
    useMinify
      ? ".__downwind_utils__{padding:0}"
      : ".__downwind_utils__ {\n  padding: 0;\n}";

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
        useMinify = pluginBuild.initialOptions.minify ?? false;

        pluginBuild.onStart(() => initPromise);
        pluginBuild.onResolve({ filter: /^virtual:@downwind\// }, (args) => ({
          path: args.path.slice(18),
          namespace: "downwind-virtual",
        }));
        pluginBuild.onLoad(
          { filter: /./, namespace: "downwind-virtual" },
          (args) => {
            switch (args.path) {
              case "base":
                return { contents: downwind.getBase(), loader: "css" };
              case "utils":
                hasCSSUtils = true;
                return { contents: getPlaceholder(), loader: "css" };
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
        const useWrite = pluginBuild.initialOptions.write ?? true;
        if (useWrite) pluginBuild.initialOptions.metafile = true;

        pluginBuild.onStart(() => initPromise);
        pluginBuild.onLoad({ filter: /\.[jt]sx?$/u }, ({ path }) => {
          // https://github.com/evanw/esbuild/issues/1222
          if (path.includes("/node_modules/")) return;
          downwind.scan(path);
          return null;
        });
        pluginBuild.onEnd((result) => {
          if (!hasCSSUtils) return;

          const transform = (cssPath: string, content: string) => {
            if (!content.includes(getPlaceholder())) {
              throw new Error(
                "Downwind: Could not inject CSS utils in build output",
              );
            }
            const withUtils = content.replace(
              getPlaceholder(),
              downwind.generate(),
            );
            return parcelTransform({
              filename: cssPath,
              code: Buffer.from(withUtils),
              minify: useMinify,
              targets,
            }).code;
          };

          if (useWrite) {
            const paths = Object.keys(result.metafile!.outputs);
            const cssPath = paths.find((p) => p.endsWith(".css"))!;
            const content = readFileSync(cssPath, "utf-8");
            writeFileSync(cssPath, transform(cssPath, content));
            rmSync(`${cssPath}.map`, { force: true });
          } else {
            const cssOutput = result.outputFiles!.find((p) =>
              p.path.endsWith(".css"),
            )!;
            const transformed = transform(cssOutput.path, cssOutput.text);
            cssOutput.contents = transformed;
            // https://github.com/evanw/esbuild/issues/2423
            Object.defineProperty(cssOutput, "text", {
              value: transformed.toString(),
            });
          }
        });
      },
    },
  ];
};
