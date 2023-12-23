import assert from "node:assert";
import { test } from "node:test";
import { selectorRE } from "../src/utils/regex.ts";

test("regex", () => {
  assert.equal(
    selectorRE.toString(),
    /(?<=['"`\s}])(?:(?:[a-z0-9][a-z0-9-]+|\*|[a-z-]+-\[[a-z0-9[\]="'_:>+*~.-]+]|\[[a-z0-9&[\]="':>+*~.()_@-]+]):)*!?(?:-?(?:[a-z][a-z0-9-]*[a-z0-9%]|[a-z][a-z-]*-\[[a-z0-9#._,'%()+*/-]+])(?:\/(?:[a-z0-9]+|\[[a-z0-9.%()+*/-]+]))?|\[[a-z][a-z-]+:[a-z0-9#._,'%()+*/-]+])(?=['"`\s:$])/g.toString(),
  );
});
