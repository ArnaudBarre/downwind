import { readFileSync, rmSync, writeFileSync } from "fs";
import { transform as parcelTransform } from "@parcel/css";

import { cssModuleToJS, initDownwind } from "./index";
import { esbuildPlugin as esbuildPluginDeclaration } from "./types";

export const esbuildPlugin: typeof esbuildPluginDeclaration = (targets) => ({
  name: "downwind",
  setup: async (build) => {
    const downwind = await initDownwind(targets);
    const cssModulesMap: Record<string, string> = {};
    let hasBase = false;
    let hasUtils = false;

    const useMinify = build.initialOptions.minify ?? false;
    const useWrite = build.initialOptions.write ?? true;
    if (useWrite) build.initialOptions.metafile = true;

    const getPlaceholder = () =>
      useMinify
        ? ".__downwind_utils__{padding:0}"
        : ".__downwind_utils__ {\n  padding: 0;\n}";

    // Virtual entries
    build.onResolve({ filter: /^virtual:@downwind\// }, (args) => ({
      path: args.path.slice(18),
      namespace: "downwind-virtual",
    }));
    build.onLoad({ filter: /./, namespace: "downwind-virtual" }, (args) => {
      switch (args.path) {
        case "base.css":
          hasBase = true;
          return { contents: downwind.getBase(), loader: "css" };
        case "utils.css":
          hasUtils = true;
          return { contents: getPlaceholder(), loader: "css" };
        default:
          throw new Error(`Unexpected virtual entry: @downwind/${args.path}`);
      }
    });

    // CSS Files
    build.onResolve({ filter: /^transpiled:/ }, ({ path }) => ({
      path: path.slice(11),
      namespace: "downwind-css-transpiled",
    }));
    build.onLoad(
      { filter: /./, namespace: "downwind-css-transpiled" },
      ({ path }) => ({ contents: cssModulesMap[path], loader: "css" }),
    );
    build.onLoad({ filter: /\.css$/ }, ({ path }) => {
      const { code, exports } = downwind.transform(path);
      if (!exports) return { contents: code, loader: "css" };
      cssModulesMap[path] = code;
      return {
        contents: `import "transpiled:${path}";${cssModuleToJS(exports)}`,
      };
    });

    // CSS scan
    build.onLoad({ filter: /\.[jt]sx?$/u }, ({ path }) => {
      // https://github.com/evanw/esbuild/issues/1222
      if (path.includes("/node_modules/")) return;
      downwind.scan(path);
      return null;
    });
    build.onEnd((result) => {
      if (!hasBase || !hasUtils) {
        result.errors.push({
          pluginName: "downwind",
          id: "missing-entry-point",
          text: `Import virtual:@downwind/${
            hasUtils ? "base.css" : "utils.css"
          } was not found in the bundle. Downwind can't work without both virtual:@downwind/base.css and virtual:@downwind/utils.css.`,
          detail: null,
          notes: [],
          location: null,
        });
        return;
      }

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
});
