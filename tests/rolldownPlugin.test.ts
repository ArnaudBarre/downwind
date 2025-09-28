import assert from "node:assert";
import { build } from "rolldown";
import { downwind } from "../src/rolldownPlugin.ts";
import { pluginSnapshotTest } from "./test-utils.ts";

pluginSnapshotTest("rolldownPlugin", async () => {
  const result = await build({
    input: "./playground/vite/src/main.tsx",
    plugins: [downwind()],
    output: { dir: "./tests/dist" },
    transform: { target: ["chrome104"] },
    write: false,
  });
  assert(result.output[1].type === "asset");
  return result.output[1].source.toString();
});
