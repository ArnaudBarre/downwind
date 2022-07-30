import { readFileSync, rmSync } from "fs";
import { build, BuildOptions } from "esbuild";

import { esbuildPlugins } from "../src/esbuildPlugins";
import { snapshotTest } from "./test-utils";

const esbuildPluginsTest = (
  name: string,
  input: string,
  opts?: BuildOptions,
) => {
  snapshotTest(`esbuildPlugins-${name}`, async () => {
    rmSync("./tests/build", { recursive: true, force: true });
    const result = await build({
      bundle: true,
      entryPoints: [`./tests/esbuild-inputs/${input}.ts`],
      plugins: esbuildPlugins(),
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

esbuildPluginsTest("simple", "simple");
esbuildPluginsTest("with-base", "with-base");
esbuildPluginsTest("simple-minify", "simple", { minify: true });
esbuildPluginsTest("simple-no-write", "simple", { write: false });
