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

initDownwind().then((downwind) => {
  downwind.scan("./input.ts");
  writeFileSync("./output.css", downwind.generate());
});
