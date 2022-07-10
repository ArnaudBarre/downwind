#!/usr/bin/env tnode
import "../src/codegen.test";

import { UserConfig } from "../src/types";

declare global {
  // eslint-disable-next-line no-var
  var TEST_CONFIG: UserConfig | undefined;
}
