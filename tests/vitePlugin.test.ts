import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { build } from "vite";

import { vitePlugin } from "../src";
import { snapshotTest } from "./test-utils";

const root = "playground/vite";
const assets = `${root}/dist/assets`;

snapshotTest("vite-build", async () => {
  await build({ root, plugins: [vitePlugin()], logLevel: "warn" });
  return readFileSync(
    `${assets}/${readdirSync(assets).find((f) => f.endsWith(".css"))!}`,
    "utf-8",
  );
});

snapshotTest("vite-build-with-base", async () => {
  const htmlPath = `${root}/index.html`;
  const html = readFileSync(htmlPath, "utf-8");
  writeFileSync(htmlPath, html.replace("main.tsx", "main-with-base.tsx"));
  await build({
    root,
    plugins: [vitePlugin()],
    build: { minify: false },
    logLevel: "warn",
  });
  writeFileSync(htmlPath, html);
  return readFileSync(
    `${assets}/${readdirSync(assets).find((f) => f.endsWith(".css"))!}`,
    "utf-8",
  );
});
