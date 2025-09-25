import { readFileSync } from "node:fs";
import type { downwind as declaration } from "./esbuild.d.ts";
import { initDownwind } from "./index.ts";

export { esbuildPlugin as downwind };

const esbuildPlugin: typeof declaration = ({
  filter = /\.tsx?$/,
  shouldScan = (path: string, code: string) =>
    path.endsWith("x") || code.includes("@downwind-scan"),
  intervalCheckMs = 50,
} = {}) => ({
  name: "downwind",
  setup: async (build) => {
    const downwind = await initDownwind();

    let hasBase = false;
    let hasUtils = false;

    let utilsResolved = false;
    let scanHappenedOnce = false;
    let scanHappened = false;
    const taskRunning = () => {
      if (utilsResolved) throw new Error("Utils are already resolved");
      scanHappenedOnce = true;
      scanHappened = true;
    };
    const timoutId = setTimeout(() => {
      if (!scanHappenedOnce) throw new Error("No file to scan");
    }, 5_000);

    // Virtual entries
    build.onResolve({ filter: /^virtual:@downwind\// }, (args) => ({
      path: args.path.slice(18),
      namespace: "downwind-virtual",
    }));
    build.onLoad(
      { filter: /./, namespace: "downwind-virtual" },
      async (args) => {
        switch (args.path) {
          case "base.css":
            hasBase = true;
            return { contents: downwind.getBase(), loader: "css" };
          case "utils.css":
            hasUtils = true;
            return {
              contents: await new Promise<string>((resolve) => {
                const intervalId = setInterval(() => {
                  if (!scanHappenedOnce) return;
                  if (scanHappened) {
                    scanHappened = false;
                  } else {
                    resolve(downwind.generate());
                    utilsResolved = true;
                    clearInterval(intervalId);
                  }
                }, intervalCheckMs);
              }),
              loader: "css",
            };
          case "devtools":
            return { contents: "" };
          default:
            throw new Error(`Unexpected virtual entry: @downwind/${args.path}`);
        }
      },
    );

    // CSS files
    build.onStart(() => {
      hasBase = false;
      hasUtils = false;
    });
    build.onLoad({ filter: /\.css$/ }, ({ path }) => {
      taskRunning();
      return {
        contents: downwind.preTransformCSS(readFileSync(path, "utf-8")).code,
        loader: path.endsWith(".module.css") ? "local-css" : "css",
      };
    });

    // Scanned files
    build.onLoad({ filter }, ({ path }) => {
      // https://github.com/evanw/esbuild/issues/1222
      if (path.includes("/node_modules/")) return;
      const code = readFileSync(path, "utf-8");
      if (shouldScan(path, code)) {
        taskRunning();
        downwind.scan(code);
      }
      return null;
    });

    build.onEnd(() => {
      if (!hasBase || !hasUtils) {
        throw new Error(
          `Import virtual:@downwind/${
            hasUtils ? "base.css" : "utils.css"
          } was not found in the bundle. Downwind can't work without both virtual:@downwind/base.css and virtual:@downwind/utils.css.`,
        );
      }
      if (!utilsResolved) throw new Error("Build ended without utils");
      clearTimeout(timoutId);
    });
  },
});
