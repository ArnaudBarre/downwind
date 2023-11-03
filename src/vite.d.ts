import { Plugin as VitePlugin } from "vite";

export declare const downwind: (opts?: {
  scannedExtension?: string;
  buildIntervalCheckMs?: number;
}) => VitePlugin[];
