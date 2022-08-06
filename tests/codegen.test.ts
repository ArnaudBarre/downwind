import { snapshotTest } from "./test-utils";

snapshotTest("codegen", (downwind) => downwind.codegen({ omitContent: false }));

snapshotTest("codegen-omit", (downwind) =>
  downwind.codegen({ omitContent: true }),
);
