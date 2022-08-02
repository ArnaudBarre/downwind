import * as assert from "node:assert";
import { writeFileSync } from "node:fs";
import { readMaybeFileSync } from "@arnaud-barre/config-loader";
import { test } from "node:test";

import { config } from "../playground/vite/downwind.config";

export const shouldUpdateSnapshots =
  process.argv.includes("--update-snapshots");

export const snapshotTest = (
  name: string,
  getContent: () => string | Promise<string>,
) => {
  test(name, { concurrency: 1 }, async () => {
    globalThis.TEST_CONFIG = config as any;
    const content = await getContent();
    const path = `./tests/snapshots/${name}.css`;
    if (shouldUpdateSnapshots) {
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
