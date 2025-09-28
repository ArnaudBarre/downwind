import type { Plugin as RolldownPlugin } from "rolldown";

export declare const downwind: (opts?: {
  /**
   * Used to reduce the number of scanned files.
   * @default (id, code) =>
   *   id.endsWith(".tsx") ||
   *   (id.endsWith(".ts") && code.includes("@downwind-scan")),
   */
  shouldScan?: (id: string, code: string) => boolean;
}) => RolldownPlugin;
