import * as assert from "node:assert";
import { writeFileSync } from "node:fs";
import { readMaybeFileSync } from "@arnaud-barre/config-loader";
import { test } from "node:test";

import { codegen } from "./codegen";

const withSnapshot = (name: string, content: string) => {
  const path = `./src/snapshots/${name}.css`;
  if (process.argv.includes("--update-snapshots")) {
    writeFileSync(path, content);
  } else {
    const expected = readMaybeFileSync(path);
    if (expected) {
      assert.equal(content, expected);
    } else {
      writeFileSync(path, content);
    }
  }
};

test("codegen", async () => {
  withSnapshot("codegen", await codegen({ omitContent: false }));
});

test("codegen-omit", async () => {
  withSnapshot("codegen-omit", await codegen({ omitContent: true }));
});

test("codegen-omit-no-container", async () => {
  TEST_CONFIG = { corePlugins: { container: false } };
  withSnapshot(
    "codegen-omit-no-container",
    await codegen({ omitContent: true }),
  );
});
