#!/usr/bin/env tnode
import { execSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build, BuildOptions, context } from "esbuild";
import packageJSON from "../package.json";

const dev = process.argv.includes("--dev");

rmSync("dist", { force: true, recursive: true });

const buildOrWatch = async (options: BuildOptions) => {
  if (!dev) return build(options);
  const ctx = await context(options);
  await ctx.watch();
  await ctx.rebuild();
};

await buildOrWatch({
  bundle: true,
  splitting: true,
  entryPoints: [
    "src/index.ts",
    "src/cli.ts",
    "src/esbuildPlugin.ts",
    "src/vitePlugin.ts",
  ],
  outdir: "dist",
  platform: "node",
  format: "esm",
  target: "node16",
  define: {
    "__VERSION__": `"${packageJSON.version}"`,
    "globalThis.TEST_CONFIG": "undefined",
  },
  external: Object.keys(packageJSON.dependencies),
  // V8 has a performance issue with object spread: https://bugs.chromium.org/p/v8/issues/detail?id=11536
  // It's used a lot for theme merging, so for now we force esbuild to polyfill it
  // (which was the behaviour pre 14.46: https://github.com/evanw/esbuild/releases/tag/v0.14.46)
  supported: { "object-rest-spread": false },
});

execSync(
  "cp -r LICENSE README.md src/esbuildPlugin.d.ts src/vitePlugin.d.ts dist/",
);
copyFileSync("src/base/base.css", "dist/base.css");
copyFileSync("src/types.d.ts", "dist/index.d.ts");

if (
  !dev &&
  // https://github.com/ArnaudBarre/github-release/blob/main/index.ts#L11-L13
  readFileSync("CHANGELOG.md", "utf-8")
    .split("\n## ")[2]
    .split("\n")[0]
    .trim() !== packageJSON.version
) {
  throw new Error("Missing changelog");
}

writeFileSync(
  "dist/package.json",
  JSON.stringify(
    {
      name: packageJSON.name,
      description: packageJSON.description,
      type: "module",
      version: packageJSON.version,
      author: packageJSON.author,
      license: packageJSON.license,
      repository: "ArnaudBarre/downwind",
      keywords: ["tailwind", "lightningcss"],
      exports: {
        ".": "./index.js",
        "./esbuild": "./esbuildPlugin.js",
        "./vite": "./vitePlugin.js",
      },
      bin: { downwind: "cli.js" },
      dependencies: packageJSON.dependencies,
    },
    null,
    2,
  ),
);
