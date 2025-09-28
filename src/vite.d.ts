import type { Plugin } from "vite";

export declare const downwind: (opts?: {
  /**
   * Used to reduce the number of scanned files.
   * @default [{ id: /\.tsx$/ }, { id: /\.ts$/, code: /@downwind-scan/ }]
   */
  filters?: { id?: StringFilter; code?: StringFilter }[];
}) => Plugin[];
