import { codegen } from "../src/codegen";
import { snapshotTest } from "./test-utils";

snapshotTest("codegen", () => codegen({ omitContent: false }));

snapshotTest("codegen-omit", () => codegen({ omitContent: true }));

snapshotTest("codegen-omit-no-container", () => {
  TEST_CONFIG = { corePlugins: { container: false } };
  return codegen({ omitContent: true });
});
