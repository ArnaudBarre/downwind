import * as assert from "node:assert";
import { writeFileSync } from "node:fs";
import { test } from "node:test";
import { readMaybeFileSync } from "@arnaud-barre/config-loader";
import { config } from "../playground/vite/downwind.config.ts";
import { initDownwindWithConfig } from "../src/index.ts";
import type { Downwind } from "../src/types.d.ts";

export const shouldUpdateSnapshots =
  process.argv.includes("--update-snapshots");

export const pluginSnapshotTest = (
  name: string,
  getContent: () => string | Promise<string>,
) => {
  test(name, { concurrency: 1 }, async () => {
    globalThis.TEST_CONFIG = config as any;
    const content = await getContent();
    expectSnapshot(name, content);
  });
};

export const snapshotTest = (
  name: string,
  getContent: (downwind: Downwind) => string,
) => {
  test(name, () => {
    expectSnapshot(
      name,
      getContent(initDownwindWithConfig({ config: config as any })),
    );
  });
};

const expectSnapshot = (name: string, content: string) => {
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
};
