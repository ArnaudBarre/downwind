import { readdirSync, readFileSync } from "node:fs";
import { build } from "vite";
import { downwind } from "../src/vitePlugin.ts";
import { pluginSnapshotTest } from "./test-utils.ts";

const root = "playground/vite";
const assets = `${root}/dist/assets`;

pluginSnapshotTest("vite-build", async () => {
  await build({
    root,
    plugins: [downwind()],
    logLevel: "warn",
    configFile: false,
  });
  return readFileSync(
    `${assets}/${readdirSync(assets).find((f) => f.endsWith(".css"))!}`,
    "utf-8",
  );
});
