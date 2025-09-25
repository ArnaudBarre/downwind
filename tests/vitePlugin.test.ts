import { readdirSync, readFileSync } from "node:fs";
import { format } from "prettier";
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
      // eslint-disable-next-line no-bitwise
      lightningcss: { targets: { chrome: 104 << 16 } },
    },
    build: { cssMinify: false },
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
  return await format(
    readFileSync(
      `${assets}/${readdirSync(assets).find((f) => f.endsWith(".css"))!}`,
      "utf-8",
    ),
    { parser: "css" },
  );
});
