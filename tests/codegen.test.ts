import { snapshotTest } from "./test-utils";

snapshotTest("codegen", (downwind) =>
  downwind.codegen({ mode: "WITH_CONTENT" }),
);

snapshotTest("codegen-omit", (downwind) =>
  downwind.codegen({ mode: "OMIT_CONTENT" }),
);
