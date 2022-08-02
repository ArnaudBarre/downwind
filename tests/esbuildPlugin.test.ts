import { readFileSync, rmSync } from "fs";
import { build, BuildOptions } from "esbuild";

import { esbuildPlugin } from "../src/esbuildPlugin";
import { snapshotTest } from "./test-utils";

const esbuildPluginTest = (
  name: string,
  input: string,
  opts?: BuildOptions,
) => {
  snapshotTest(`esbuildPlugin-${name}`, async () => {
    rmSync("./tests/build", { recursive: true, force: true });
    const result = await build({
      bundle: true,
      entryPoints: [`./tests/esbuild-inputs/${input}.ts`],
      plugins: [esbuildPlugin()],
      outdir: "./tests/build",
      ...opts,
    });
    if (opts?.write === false) {
      return result.outputFiles!.find((p) => p.path.endsWith(".css"))!.text;
    }
    const path = Object.keys(result.metafile!.outputs).find((p) =>
      p.endsWith(".css"),
    )!;
    return readFileSync(path, "utf-8");
  });
};

esbuildPluginTest("with-css", "with-css");
esbuildPluginTest("with-base", "with-base");
esbuildPluginTest("with-css-minify", "with-css", { minify: true });
esbuildPluginTest("with-css-no-write", "with-css", { write: false });
