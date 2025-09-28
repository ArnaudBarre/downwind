import type { Plugin } from "rolldown";
import { initDownwind } from "./index.ts";
import type { Downwind } from "./types.d.ts";

const cssRE = /\.css(\?.+)?$/;

export const getRollupUtils = (
  shouldScan: (id: string, code: string) => boolean,
) => {
  let downwind: Downwind;
  let hasBase = false;
  let hasUtils = false;
  const baseVirtual = "virtual:@downwind/base.css";
  const baseModuleId = `/${baseVirtual}`;
  const utilsVirtual = "virtual:@downwind/utils.css";
  const utilsModuleId = `/${utilsVirtual}`;
  const devtoolsVirtual = "virtual:@downwind/devtools";
  const devtoolsModuleId = `/${devtoolsVirtual}`;
  const resolveId = {
    filter: { id: /^virtual:@downwind\// },
    handler: (id: string) => {
      if (id === baseVirtual) {
        hasBase = true;
        return baseModuleId;
      }
      if (id === utilsVirtual) {
        hasUtils = true;
        return utilsModuleId;
      }
      if (id === devtoolsVirtual) return devtoolsModuleId;
    },
  } satisfies Plugin["resolveId"];
  const buildLoad = {
    filter: { id: /^\/virtual:@downwind\// },
    handler: (id: string) => {
      if (id === baseModuleId) return downwind.getBase();
      if (id === utilsModuleId) return "";
      if (id === devtoolsModuleId) return "";
    },
  } satisfies Plugin["load"];
  const buildTransform = {
    filter: { id: { exclude: /\/node_modules\// } },
    handler: (code: string, id: string) => {
      if (id === baseVirtual) return;
      if (id === utilsVirtual) return;
      if (id === devtoolsVirtual) return;
      if (cssRE.test(id)) return downwind.preTransformCSS(code).code;
      if (shouldScan(id, code)) downwind.scan(code);
    },
  } satisfies Plugin["transform"];

  return {
    downwind() {
      return downwind;
    },
    baseModuleId,
    utilsModuleId,
    devtoolsModuleId,
    resolveId,
    buildLoad,
    buildTransform,
    async buildStart() {
      downwind = await initDownwind();
      hasBase = false;
      hasUtils = false;
    },
    getEntryPointsError: () => {
      if (!hasBase || !hasUtils) {
        return '[downwind] Entry points not found, did you add `import "virtual:@downwind/base.css"` and `import "virtual:@downwind/utils.css"` in your main entry?';
      }
    },
  };
};
