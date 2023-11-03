import { Plugin as ESBuildPlugin } from "esbuild";

export declare const downwind: (opts?: {
  scannedExtension?: string;
  scanRegex?: RegExp;
  intervalCheckMs?: number;
}) => ESBuildPlugin;
