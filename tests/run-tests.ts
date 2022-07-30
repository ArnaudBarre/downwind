#!/usr/bin/env tnode

import type { UserConfig } from "../src/types";

declare global {
  // eslint-disable-next-line no-var
  var TEST_CONFIG: UserConfig | undefined;
}

(globalThis as any).__VERSION__ = "test";

/* eslint-disable @typescript-eslint/no-require-imports */
require("./codegen.test");
require("./esbuildPlugins.test");
