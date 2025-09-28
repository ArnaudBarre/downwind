import { readFileSync, rmSync } from "node:fs";
import { build, formatMessagesSync } from "esbuild";
import { downwind } from "../src/esbuildPlugin.ts";
import { pluginSnapshotTest } from "./test-utils.ts";

for (const idleMs of [50, "experimental-double-build" as const]) {
  pluginSnapshotTest("esbuildPlugin", async () => {
    rmSync("./tests/dist", { recursive: true, force: true });
    const result = await build({
      bundle: true,
      entryPoints: ["./playground/vite/src/main.tsx"],
      plugins: [downwind({ idleMs })],
      outdir: "./tests/dist",
      target: ["chrome104"],
    });
    if (result.warnings.length) {
      const messages = formatMessagesSync(result.warnings, {
        kind: "warning",
        color: true,
      });
      for (const message of messages) console.log(message);
    }
    return readFileSync("./tests/dist/main.css", "utf-8");
  });
}
