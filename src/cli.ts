#!/usr/bin/env node
import type { Downwind } from "./types";

const firstArg = process.argv[2] as string | undefined;

if (firstArg === "-v" || firstArg === "--version") {
  console.log(__VERSION__);
  process.exit();
}

const help = () => {
  console.log(`\x1b[36mDownwind ${__VERSION__}\x1b[39m
  -o, --output   Specifies the output
  --omit-content Generates only classes names
`);
};

if (firstArg === "--help" || firstArg === undefined) {
  help();
  process.exit();
}

const mode = process.argv.includes("--omit-content")
  ? "OMIT_CONTENT"
  : "WITH_CONTENT";
let outputIndex = process.argv.indexOf("-o");
if (outputIndex === -1) outputIndex = process.argv.indexOf("--output");
const output = outputIndex === -1 ? undefined : process.argv[outputIndex + 1];
if (!output) {
  console.error("\x1b[31mNo output provided\x1b[39m");
  help();
  process.exit(1);
}

/* eslint-disable @typescript-eslint/no-require-imports */
require("./index.js")
  .initDownwind()
  .then((downwind: Downwind) => {
    const { writeFileSync, existsSync, mkdirSync } =
      require("fs") as typeof import("fs");
    const dir = require("path").dirname(output);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(output, downwind.codegen({ mode }));
  });
