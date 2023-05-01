import { snapshotTest } from "./test-utils.ts";

snapshotTest("codegen", (downwind) =>
  downwind.codegen({ mode: "WITH_CONTENT" }),
);

snapshotTest("codegen-omit", (downwind) =>
  downwind.codegen({ mode: "OMIT_CONTENT" }),
);
