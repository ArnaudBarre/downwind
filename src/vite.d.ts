import { Plugin as VitePlugin } from "vite";

export declare const downwind: (opts?: {
  /**
   * Used to reduce the number of scanned files.
   * @default (id, code) =>
   *   id.endsWith(".tsx") ||
   *   (id.endsWith(".ts") && code.includes("@downwind-scan")),
   */
  shouldScan?: (id: string, code: string) => boolean;
  /**
   * Number of millisecond without new scan to wait before generating utils
   * @default 200
   */
  buildIntervalCheckMs?: number;
}) => VitePlugin[];
