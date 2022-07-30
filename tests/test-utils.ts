import * as assert from "node:assert";
import { writeFileSync } from "node:fs";
import { readMaybeFileSync } from "@arnaud-barre/config-loader";
import { test } from "node:test";

export const snapshotTest = (
  name: string,
  getContent: () => string | Promise<string>,
) => {
  test(name, async () => {
    const content = await getContent();
    const path = `./tests/snapshots/${name}.css`;
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
  });
};
