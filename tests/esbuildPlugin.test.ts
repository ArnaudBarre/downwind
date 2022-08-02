import { readFileSync, rmSync } from "fs";
import { build, BuildOptions, formatMessagesSync } from "esbuild";

import { esbuildPlugin } from "../src/esbuildPlugin";
import { snapshotTest } from "./test-utils";

const esbuildPluginTest = (name: string, opts?: BuildOptions) => {
  snapshotTest(`esbuildPlugin-${name}`, async () => {
    rmSync("./tests/build", { recursive: true, force: true });
    const result = await build({
      bundle: true,
      entryPoints: ["./tests/esbuild-inputs/index.ts"],
      plugins: [esbuildPlugin()],
      outdir: "./tests/build",
      ...opts,
    });
    if (result.warnings.length) {
      formatMessagesSync(result.warnings, {
        kind: "warning",
        color: true,
      }).forEach((m) => console.log(m));
    }

    if (opts?.write === false) {
      return result.outputFiles!.find((p) => p.path.endsWith(".css"))!.text;
    }
    const path = Object.keys(result.metafile!.outputs).find((p) =>
      p.endsWith(".css"),
    )!;
    return readFileSync(path, "utf-8");
  });
};

esbuildPluginTest("simple");
esbuildPluginTest("minify", { minify: true });
esbuildPluginTest("no-write", { write: false });
