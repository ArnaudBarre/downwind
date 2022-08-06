#!/usr/bin/env tnode
import { writeFileSync, existsSync } from "node:fs";

import "./set-version";

import { initDownwindWithConfig } from "../src";

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

const logs: string[][] = [];
const warnings: string[] = [];
console.warn = (message: string) => warnings.push(message);
console.log = (...args: any[]) =>
  logs.push(args.map((v) => (typeof v === "object" ? JSON.stringify(v) : v)));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const downwind = initDownwindWithConfig({ config: require("./config").config });
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
