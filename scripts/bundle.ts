#!/usr/bin/env tnode
import { execSync } from "child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "fs";
import { build, BuildOptions } from "esbuild";

import {
  author,
  dependencies,
  description,
  license,
  name,
  version,
} from "../package.json";

const dev = process.argv.includes("--dev");

rmSync("dist", { force: true, recursive: true });

const commonOptions: BuildOptions = {
  outdir: "dist",
  platform: "node",
  target: "node16",
  define: { "__VERSION__": `"${version}"`, "global.TEST_CONFIG": "undefined" },
  watch: dev,
};

Promise.all([
  build({
    entryPoints: ["src/cli.ts", "src/esbuildPlugin.ts", "src/vitePlugin.ts"],
    ...commonOptions,
  }),
  build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    external: Object.keys(dependencies),
    // V8 has an performance issue with object spread: https://bugs.chromium.org/p/v8/issues/detail?id=11536
    // It's used a lot for theme merging, so for now we force esbuild to polyfill it
    // (which was the behaviour pre 14.46: https://github.com/evanw/esbuild/releases/tag/v0.14.46)
    supported: { "object-rest-spread": false },
    ...commonOptions,
  }),
]).then(() => {
  execSync("cp -r LICENSE README.md dist/");
  copyFileSync("src/base/base.css", "dist/base.css");

  for (const tool of ["esbuild", "vite"]) {
    copyFileSync(`src/${tool}Plugin.d.ts`, `dist/${tool}.d.ts`);
    // light custom esm -> cjs
    writeFileSync(
      `dist/${tool}.js`,
      readFileSync(`dist/${tool}Plugin.js`, "utf-8")
        .replaceAll(
          /import \{([^}]+)\} from "(.*)";/gu,
          (_, specifiers: string, from: string) =>
            `const {${specifiers.replaceAll(
              " as ",
              ": ",
            )}} = require("${from}");`,
        )
        .replace(`export { ${tool}Plugin as downwind };\n`, "")
        .concat(`module.exports.downwind = ${tool}Plugin;\n`),
    );
    rmSync(`dist/${tool}Plugin.js`);
  }

  writeFileSync(
    "dist/index.d.ts",
    readFileSync("src/types.d.ts", "utf-8").replaceAll(
      /export type (.*) =/gu,
      (substring, match) =>
        [
          "DownwindConfig",
          "BaseRule",
          "StaticRule",
          "ThemeRule<T>",
          "DirectionThemeRule",
          "DownwindTheme",
        ].includes(match)
          ? substring
          : substring.slice(7),
    ),
  );

  writeFileSync(
    "dist/package.json",
    JSON.stringify(
      {
        name,
        description,
        version,
        author,
        license,
        repository: "ArnaudBarre/downwind",
        bin: { downwind: "cli.js" },
        keywords: ["tailwind", "@parcel/css"],
        dependencies,
      },
      null,
      2,
    ),
  );
});
