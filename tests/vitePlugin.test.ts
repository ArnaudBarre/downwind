import { readdirSync, readFileSync } from "node:fs";
import { build } from "vite";
import { downwind } from "../src/vitePlugin.ts";
import { pluginSnapshotTest } from "./test-utils.ts";

const root = "playground/vite";
const assets = `${root}/dist/assets`;

pluginSnapshotTest("vite", async () => {
  await build({
    root,
    plugins: [downwind()],
    logLevel: "warn",
    css: {
      transformer: "lightningcss",
      lightningcss: {}, // https://github.com/vitejs/vite/pull/14872
    },
    build: { cssMinify: false, target: ["chrome104"] },
    configFile: false,
  });
  return readFileSync(
    `${assets}/${readdirSync(assets).find((f) => f.endsWith(".css"))!}`,
    "utf-8",
  );
});
pluginSnapshotTest("vite-minify", async () => {
  await build({
    root,
    plugins: [downwind()],
    logLevel: "warn",
    css: { transformer: "lightningcss" },
    build: { cssMinify: "lightningcss" },
    configFile: false,
  });
  return readFileSync(
    `${assets}/${readdirSync(assets).find((f) => f.endsWith(".css"))!}`,
    "utf-8",
  );
});
