import { codegen } from "../src/codegen";
import { snapshotTest } from "./test-utils";

snapshotTest("codegen", () => codegen({ omitContent: false }));
snapshotTest("codegen-omit", () => codegen({ omitContent: true }));
