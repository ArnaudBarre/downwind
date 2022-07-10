import { readFileSync } from "fs";
import { join } from "path";

import { baseFonts } from "../theme/baseFonts";
import { ResolvedTheme } from "../types";

export const getBase = (theme: ResolvedTheme) => {
  const rawCSS = readFileSync(join(__dirname, "base.css"), "utf-8");
  return rawCSS
    .replace("__BORDER_COLOR__", theme.borderColor.DEFAULT ?? "currentColor")
    .replace("__FONT_SANS__", theme.fontFamily.sans ?? baseFonts.sans)
    .replace("__FONT_MONO__", theme.fontFamily.mono ?? baseFonts.mono)
    .replace("__PLACEHOLDER_COLOR__", theme.colors["gray-400"] ?? "#9ca3af");
};
