#!/usr/bin/env tnode
import type { UserConfig } from "../src/types.d.ts";
import "./set-test-version.ts";

declare global {
  // eslint-disable-next-line no-var
  var TEST_CONFIG: UserConfig | undefined;
}

import("./generate.test.ts");
import("./preTransformCSS.test.ts");
import("./codegen.test.ts");
import("./esbuildPlugin.test.ts");
import("./vitePlugin.test.ts");
