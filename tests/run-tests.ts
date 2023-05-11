#!/usr/bin/env tnode
import type { UserConfig } from "../src/types.d.ts";

declare global {
  // eslint-disable-next-line no-var
  var TEST_CONFIG: UserConfig | undefined;
}

(globalThis as any).__VERSION__ = "test";

import("./generate.test.ts");
import("./preTransform.test.ts");
import("./convertTargets.test.ts");
import("./cssModuleToJS.test.ts");
import("./codegen.test.ts");
import("./esbuildPlugin.test.ts");
import("./vitePlugin.test.ts");
