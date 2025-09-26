#!/usr/bin/env node
import type { UserConfig } from "../src/types.d.ts";
import "./set-test-version.ts";

declare global {
  var TEST_CONFIG: UserConfig | undefined;
}

void import("./generate.test.ts");
void import("./regex.test.ts");
void import("./preTransformCSS.test.ts");
void import("./toInlineCss.test.ts");
void import("./codegen.test.ts");
void import("./esbuildPlugin.test.ts");
void import("./vitePlugin.test.ts");
