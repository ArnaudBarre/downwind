#!/usr/bin/env tnode
import type { UserConfig } from "../src/types.d.ts";

declare global {
  // eslint-disable-next-line no-var
  var TEST_CONFIG: UserConfig | undefined;
}

(globalThis as any).__VERSION__ = "test";

/* eslint-disable @typescript-eslint/no-require-imports */
require("./generate.test");
require("./preTransform.test");
require("./convertTargets.test");
require("./cssModuleToJS.test");
require("./codegen.test");
require("./esbuildPlugin.test");
require("./vitePlugin.test");
