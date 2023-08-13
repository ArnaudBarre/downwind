import { readFileSync, rmSync } from "node:fs";
import { build, type BuildOptions, formatMessagesSync } from "esbuild";
import { downwind } from "../src/esbuildPlugin.ts";
import { pluginSnapshotTest } from "./test-utils.ts";

const esbuildPluginTest = (name: string, opts?: BuildOptions) => {
  pluginSnapshotTest(`esbuildPlugin-${name}`, async () => {
    rmSync("./tests/dist", { recursive: true, force: true });
    const result = await build({
      bundle: true,
      entryPoints: ["./playground/vite/src/main.tsx"],
      plugins: [downwind()],
      outdir: "./tests/dist",
      ...opts,
    });
    if (result.warnings.length) {
      const messages = formatMessagesSync(result.warnings, {
        kind: "warning",
        color: true,
      });
      for (const message of messages) console.log(message);
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
esbuildPluginTest("hash", { entryNames: "[dir]/[name]-[hash]" });
