import { Plugin as ESBuildPlugin } from "esbuild";

export declare const downwind: (opts?: {
  scannedExtension?: string;
}) => ESBuildPlugin;
