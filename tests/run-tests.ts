#!/usr/bin/env node
import type { UserConfig } from "../src/types.d.ts";
import "./set-test-version.ts";

declare global {
  var TEST_CONFIG: UserConfig | undefined;
}

import("./generate.test.ts");
import("./regex.test.ts");
import("./preTransformCSS.test.ts");
import("./codegen.test.ts");
import("./esbuildPlugin.test.ts");
import("./vitePlugin.test.ts");
