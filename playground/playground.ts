#!/usr/bin/env tnode
import { writeFileSync, existsSync } from "node:fs";

import "./set-version";

import { initDownwind } from "../src";

if (!existsSync("./config.ts")) {
  writeFileSync(
    "./config.ts",
    `import type { UserConfig } from "../src/types";

export const config: UserConfig = {};
`,
  );
  writeFileSync(
    "./input.ts",
    `// @css-scan
console.log("p-4");
`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
globalThis.TEST_CONFIG = require("./config").config;

const logs: string[][] = [];
const warnings: string[] = [];
console.warn = (message: string) => warnings.push(message);
console.log = (...args: any[]) =>
  logs.push(args.map((v) => (typeof v === "object" ? JSON.stringify(v) : v)));

initDownwind().then((downwind) => {
  downwind.scan("./input.ts");
  const warningsHeader = warnings.length
    ? `/* Warnings:\n${warnings.join("\n")}\n*/\n`
    : "";
  const logsHeader = logs.length
    ? `/* Logs:\n${logs.map((l) => l.join(", ")).join("\n")}\n*/\n`
    : "";
  writeFileSync(
    "./output.css",
    warningsHeader + logsHeader + downwind.generate(),
  );
});
