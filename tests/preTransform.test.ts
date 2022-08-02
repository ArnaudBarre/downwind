import { initDownwind } from "../src";
import { snapshotTest } from "./test-utils";

snapshotTest("preTransform", async () => {
  const downwind = await initDownwind();
  return downwind.preTransform(`
.class1 {
  @apply m-4 px-4;
}

@screen landscape {
  .class2 {
    @apply px-4 m-4;
  }
}

.class3 {@apply hover:p-4 first:p-8}

@screen md {
  .class4 {
    @apply top-4 last:space-y-10
  }
}
`);
});
