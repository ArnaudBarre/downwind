#!/usr/bin/env tnode
import { execSync } from "child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "fs";
import { build, BuildOptions, context } from "esbuild";

import * as packageJSON from "../package.json";

const dev = process.argv.includes("--dev");

rmSync("dist", { force: true, recursive: true });

const commonOptions: BuildOptions = {
  outdir: "dist",
  platform: "node",
  target: "node16",
  define: {
    "__VERSION__": `"${packageJSON.version}"`,
    "global.TEST_CONFIG": "undefined",
  },
};

const buildOrWatch = async (options: BuildOptions) => {
  if (dev) await (await context(options)).watch();
  else await build(options);
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
Promise.all([
  buildOrWatch({
    entryPoints: ["src/cli.ts", "src/esbuildPlugin.ts", "src/vitePlugin.ts"],
    ...commonOptions,
    plugins: [
      {
        name: "Update plugins output",
        setup: ({ onEnd }) =>
          onEnd(() => {
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
                      )}} = require("${from.replace(".ts", ".js")}");`,
                  )
                  .replace(`export { ${tool}Plugin as downwind };\n`, "")
                  .concat(`module.exports.downwind = ${tool}Plugin;\n`),
              );
              rmSync(`dist/${tool}Plugin.js`);
            }
          }),
      },
    ],
  }),
  buildOrWatch({
    bundle: true,
    entryPoints: ["src/index.ts"],
    external: Object.keys(packageJSON.dependencies),
    // V8 has a performance issue with object spread: https://bugs.chromium.org/p/v8/issues/detail?id=11536
    // It's used a lot for theme merging, so for now we force esbuild to polyfill it
    // (which was the behaviour pre 14.46: https://github.com/evanw/esbuild/releases/tag/v0.14.46)
    supported: { "object-rest-spread": false },
    ...commonOptions,
  }),
]).then(() => {
  execSync("cp -r LICENSE README.md dist/");
  copyFileSync("src/base/base.css", "dist/base.css");
  copyFileSync("src/types.d.ts", "dist/index.d.ts");

  if (
    !dev &&
    // https://github.com/ArnaudBarre/github-release/blob/main/index.ts#L10-L11
    readFileSync("CHANGELOG.md", "utf-8")
      .split("##")[2]
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
        version: packageJSON.version,
        author: packageJSON.author,
        license: packageJSON.license,
        repository: "ArnaudBarre/downwind",
        bin: { downwind: "cli.js" },
        keywords: ["tailwind", "lightningcss"],
        dependencies: packageJSON.dependencies,
      },
      null,
      2,
    ),
  );
});
