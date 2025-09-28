import type { Plugin } from "rolldown";
import type { downwind as declaration } from "./rolldown.d.ts";
import { getRollupUtils } from "./rollupUtils.ts";

export { rolldownPlugin as downwind };

const rolldownPlugin: typeof declaration = ({
  shouldScan = (id: string, code: string) =>
    id.endsWith(".tsx")
    || (id.endsWith(".ts") && code.includes("@downwind-scan")),
} = {}): Plugin => {
  const {
    downwind,
    utilsModuleId,
    buildStart,
    resolveId,
    buildLoad,
    buildTransform,
    getEntryPointsError,
  } = getRollupUtils(shouldScan);

  return {
    name: "downwind",
    buildStart,
    resolveId,
    load: buildLoad,
    transform: buildTransform,
    renderChunk() {
      // TODO:
    },
    generateBundle() {
      const error = getEntryPointsError();
      if (error) this.error(error);
    },
  };
};
