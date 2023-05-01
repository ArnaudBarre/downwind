#!/usr/bin/env tnode
import type { UserConfig } from "../src/types.d.ts";

declare global {
  // eslint-disable-next-line no-var
  var TEST_CONFIG: UserConfig | undefined;
}

(globalThis as any).__VERSION__ = "test";

/* eslint-disable @typescript-eslint/no-require-imports */
require("./generate.test.ts");
require("./preTransform.test.ts");
require("./convertTargets.test.ts");
require("./cssModuleToJS.test.ts");
require("./codegen.test.ts");
require("./esbuildPlugin.test.ts");
require("./vitePlugin.test.ts");
