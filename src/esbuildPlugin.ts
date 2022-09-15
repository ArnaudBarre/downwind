import { createHash } from "crypto";
import { readFileSync, rmSync, writeFileSync } from "fs";
import { transform as lightningCSSTransform } from "lightningcss";

import { downwind as declaration } from "./esbuildPlugin.d";
import { cssModuleToJS, initDownwind, convertTargets } from "./index";

export { esbuildPlugin as downwind };

const esbuildPlugin: typeof declaration = ({ scannedExtension } = {}) => ({
  name: "downwind",
  setup: async (build) => {
    const targets = convertTargets(build.initialOptions.target);
    const downwind = await initDownwind({
      targets,
      scannedExtension,
      root: build.initialOptions.absWorkingDir,
    });
    const cssModulesMap: Record<string, string> = {};
    let hasBase = false;
    let hasUtils = false;

    const useHash =
      build.initialOptions.entryNames?.includes("[hash]") ?? false;
    const minify = build.initialOptions.minify ?? false;
    const write = build.initialOptions.write ?? true;
    if (write) build.initialOptions.metafile = true;

    const getPlaceholder = () =>
      minify
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
      }
      if (result.errors.length) return;

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
        const output = lightningCSSTransform({
          filename: cssPath,
          code: Buffer.from(withUtils),
          drafts: { nesting: true },
          minify,
          targets,
        }).code;
        if (!useHash) return { output, path: cssPath };
        const hexHash = createHash("sha256")
          .update(output)
          .digest("hex")
          .slice(0, 10);
        const hash = Number.parseInt(hexHash, 16)
          .toString(26)
          .toUpperCase()
          .padStart(8, "0")
          .slice(0, 8);
        return { output, path: cssPath.replace(/[A-Z\d]{8}/, hash) };
      };

      if (write) {
        const outputs = result.metafile!.outputs;
        const paths = Object.keys(outputs);
        const cssPath = paths.find((p) => p.endsWith(".css"))!;
        const content = readFileSync(cssPath, "utf-8");
        const { output, path } = transform(cssPath, content);
        writeFileSync(path, output);
        outputs[path] = { ...outputs[path], bytes: output.byteLength };
        if (useHash) {
          rmSync(cssPath);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete outputs[cssPath];
        }
        rmSync(`${cssPath}.map`, { force: true });
      } else {
        const cssOutput = result.outputFiles!.find((p) =>
          p.path.endsWith(".css"),
        )!;
        const { output, path } = transform(cssOutput.path, cssOutput.text);
        cssOutput.path = path;
        cssOutput.contents = output;
        // https://github.com/evanw/esbuild/issues/2423
        Object.defineProperty(cssOutput, "text", {
          value: output.toString(),
        });
      }
    });
  },
});
