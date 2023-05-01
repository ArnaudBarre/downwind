import { snapshotTest } from "./test-utils.ts";

snapshotTest(
  "preTransform",
  (downwind) =>
    downwind.preTransform(`
.class1 {
  @apply m-4 px-4;
  min-height: theme("spacing.2.5");
}

@media screen(landscape) {
  .class2 {
    @apply px-4 m-4;
    background: theme("colors.blue-500 / 50%");
  }
}

.class3 {@apply hover:p-4 first:p-8}

@media screen(md) and (min-height: 25rem) {
  .class4 {
    @apply btn
    @apply top-4 last:space-y-10
  }
}
`).content,
);
