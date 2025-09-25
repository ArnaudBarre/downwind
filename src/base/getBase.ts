import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getBaseFonts } from "../theme/getBaseFonts.ts";
import type { ResolvedTheme } from "../types.d.ts";

export const getBase = (theme: ResolvedTheme) => {
  const rawCSS = readFileSync(
    join(import.meta.filename, "..", "base.css"),
    "utf-8",
  );
  const getBaseFont = getBaseFonts();
  return rawCSS
    .replace("__BORDER_COLOR__", theme.borderColor["DEFAULT"] ?? "currentColor")
    .replace("__FONT_SANS__", theme.fontFamily["sans"] ?? getBaseFont.sans)
    .replace("__FONT_MONO__", theme.fontFamily["mono"] ?? getBaseFont.mono)
    .replace("__PLACEHOLDER_COLOR__", theme.colors["gray-400"] ?? "#9ca3af");
};
