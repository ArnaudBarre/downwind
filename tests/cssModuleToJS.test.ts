import * as assert from "node:assert";
import test from "node:test";

import { cssModuleToJS } from "../src/utils/cssModuleToJS";

test("convertTargets", () => {
  assert.equal(
    cssModuleToJS({
      "container": {
        name: "_container_11zaj_1",
        composes: [],
        isReferenced: false,
      },
      "kebab-case": {
        name: "_kebab-case_11zaj_6",
        composes: [],
        isReferenced: false,
      },
    }),
    `
export const container = "_container_11zaj_1";
export default {
  container,
  "kebab-case": "_kebab-case_11zaj_6",
};`.trim(),
  );
});
