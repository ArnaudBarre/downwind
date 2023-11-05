import { Plugin as ESBuildPlugin } from "esbuild";

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
   * Number of millisecond without new scan to wait before generating utils
   * @default 50
   */
  intervalCheckMs?: number;
}) => ESBuildPlugin;
