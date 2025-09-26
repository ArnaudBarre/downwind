import { snapshotTest } from "./test-utils.ts";

snapshotTest(
  "toInlineCSS",
  (downwind) => `.wrapper {
${Object.entries(downwind.toInlineCSS("m-4 p-4 [color:red] btn bg-[#123]/80"))
  .map(([key, value]) => `  ${key}: ${value};`)
  .join("\n")}
}
`,
);
