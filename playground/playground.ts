#!/usr/bin/env tnode
import { existsSync, writeFileSync } from "node:fs";

import "./set-version.ts";
import { initDownwindWithConfig } from "../src/index.ts";

if (!existsSync("./config.ts")) {
  writeFileSync(
    "./config.ts",
    `import type { DownwindConfig } from "../src/types";

export const config: UserConfig = {};
`,
  );
  writeFileSync(
    "./input.ts",
    `// @downwind-scan
console.log("p-4");
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
downwind.scan("./input.ts");

const transform = downwind.transform("./input.module.css").code;
const utils = downwind.generate();

const warningsHeader = warnings.length
  ? `/* Warnings:\n${warnings.join("\n")}\n*/\n`
  : "";
const logsHeader = logs.length
  ? `/* Logs:\n${logs.map((l) => l.join(", ")).join("\n")}\n*/\n`
  : "";

writeFileSync("./output.css", warningsHeader + logsHeader + transform + utils);
