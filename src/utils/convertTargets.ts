import {
  convertTargets as convertTargetsDeclaration,
  ParcelTargets,
} from "../types";

// Convert https://esbuild.github.io/api/#target
// To https://github.com/parcel-bundler/parcel-css/blob/master/node/targets.d.ts

const map: Record<string, keyof ParcelTargets | null | undefined> = {
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  hermes: null,
  ie: "ie",
  ios: "ios_saf",
  node: null,
  opera: "opera",
  rhino: null,
  safari: "safari",
};

// From https://github.com/evanw/esbuild/issues/121#issuecomment-646956379
const esMap: Record<number, string[]> = {
  2015: ["chrome49", "safari10.1", "firefox45", "edge14"],
  2016: ["chrome52", "safari10.1", "firefox52", "edge14"],
  2017: ["chrome55", "safari10.1", "firefox52", "edge15"],
  2018: ["chrome60", "safari11.1", "firefox55", "edge79"],
  2019: ["chrome66", "safari11.1", "firefox58", "edge79"],
  2020: ["chrome80", "safari13.1", "firefox72", "edge80"],
};

const esRE = /es(\d{4})/;
const versionRE = /\d/;

export const convertTargets: typeof convertTargetsDeclaration = (
  esbuildTarget: string | string[] | undefined | false,
): ParcelTargets | undefined => {
  if (!esbuildTarget) return;

  const targets: ParcelTargets = {};

  const list = Array.isArray(esbuildTarget) ? esbuildTarget : [esbuildTarget];
  const entriesWithoutES = list.flatMap((e) => {
    const match = e.match(esRE);
    return match ? esMap[Math.min(Number(match[1]), 2020)] : e;
  });

  for (const entry of entriesWithoutES) {
    if (entry === "esnext") continue;
    const index = entry.match(versionRE)?.index;
    if (index) {
      const browser = map[entry.slice(0, index)];
      if (browser === null) continue; // No mapping available
      if (browser) {
        const [major, minor = 0] = entry
          .slice(index)
          .split(".")
          .map((v) => parseInt(v, 10));
        if (!isNaN(major) && !isNaN(minor)) {
          // eslint-disable-next-line no-bitwise
          const version = (major << 16) | (minor << 8);
          if (!targets[browser] || version < targets[browser]!) {
            targets[browser] = version;
          }
          continue;
        }
      }
    }
    throw new Error(`Unsupported target entry ${entry}`);
  }

  return targets;
};
