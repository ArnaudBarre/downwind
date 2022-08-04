import { readdirSync, readFileSync } from "node:fs";
import { build } from "vite";

import { downwind } from "../src/vitePlugin";
import { snapshotTest } from "./test-utils";

const root = "playground/vite";
const assets = `${root}/dist/assets`;

snapshotTest("vite-build", async () => {
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
