import * as assert from "node:assert";
import test from "node:test";

import { convertTargets } from "../src/utils/convertTargets";

test("convertTargets", () => {
  assert.deepStrictEqual(convertTargets("es2018"), {
    chrome: 3932160,
    edge: 5177344,
    firefox: 3604480,
    safari: 721152,
  });
  assert.deepStrictEqual(convertTargets(["safari13.1", "ios13", "node14"]), {
    ios_saf: 851968,
    safari: 852224,
  });
});
