#!/usr/bin/env tnode
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import "./set-version.ts";
import { initDownwindWithConfig } from "../src/index.ts";

if (!existsSync("./config.ts")) {
  writeFileSync(
    "./config.ts",
    `import type { DownwindConfig } from "../src/types.d.ts";

export const config: DownwindConfig = {};
`,
  );
  writeFileSync(
    "./input.ts",
    `const foo = "p-4";
`,
  );
  writeFileSync(
    "./input.module.css",
    `.container {
  @apply p-12 text-center;
}
`,
  );
}

const logs: string[][] = [];
const warnings: string[] = [];
console.warn = (message: string) => warnings.push(message);
console.log = (...args: any[]) =>
  logs.push(args.map((v) => (typeof v === "object" ? JSON.stringify(v) : v)));

const downwind = initDownwindWithConfig({
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore (file exist locally but not on CI)
  config: (await import("./config.ts")).config,
});
downwind.scan(readFileSync("./input.ts", "utf-8"));

const css = downwind.preTransformCSS(
  readFileSync("./input.module.css", "utf-8"),
).code;
const utils = downwind.generate();

const warningsHeader = warnings.length
  ? `/* Warnings:\n${warnings.join("\n")}\n*/\n`
  : "";
const logsHeader = logs.length
  ? `/* Logs:\n${logs.map((l) => l.join(", ")).join("\n")}\n*/\n`
  : "";

writeFileSync("./output.css", warningsHeader + logsHeader + css + utils);
