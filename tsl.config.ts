// tsl.config.ts
import { allRules } from "@arnaud-barre/tsl-config";
import { core, defineConfig } from "tsl";

export default defineConfig({
  rules: [...allRules],
  overrides: [
    {
      files: ["/tests/"],
      rules: [core.noFloatingPromises({ allowList: ["test"] })],
    },
  ],
});
