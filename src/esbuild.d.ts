import type { Plugin as ESBuildPlugin } from "esbuild";

export declare const downwind: (opts?: {
  /**
   * Pass to esbuild to reduce the number of file read from the disk
   * @default: /\.tsx?$/
   **/
  filter?: RegExp;
  /**
   * Used to reduce the number of scanned files.
   * @default (path, code) => path.endsWith("x") || code.includes("@downwind-scan")
   */
  shouldScan?: (path: string, code: string) => boolean;
  /**
   * Number of milliseconds without new scan to wait before generating utils
   * `experimental-double-build` is an attempt to use a second in memeory build to scan all the files instead of using a timeout.
   * This will consume more ressources but it avoids build randomlly failling on low-end environments like GH actions.
   * @default 50
   */
  idleMs?: number | "experimental-double-build";
}) => ESBuildPlugin;
