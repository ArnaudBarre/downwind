import baseConfig from "@arnaud-barre/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig(baseConfig, {
  rules: {
    "require-unicode-regexp": "off",
    "no-param-reassign": "off",
    // https://github.com/tailwindlabs/tailwindcss-intellisense/issues/1468
    "unicorn/prefer-import-meta-properties": "off",
  },
});
