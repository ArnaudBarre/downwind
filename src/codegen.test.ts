import * as assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { codegen } from "./codegen";

test("codegen-omit", async () => {
  assert.equal(
    await codegen({ omitContent: true }),
    readFileSync("./src/snapshots/codegen-omit.css", "utf-8"),
  );
});

test("codegen-omit-no-container", async () => {
  TEST_CONFIG = { corePlugins: { container: false } };
  assert.equal(
    await codegen({ omitContent: true }),
    readFileSync("./src/snapshots/codegen-omit-no-container.css", "utf-8"),
  );
});
