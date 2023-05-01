import type { ResolvedTheme, ThemeKey } from "../types.d.ts";

export const themeGet = (theme: ResolvedTheme, path: string) => {
  const dotIndex = path.indexOf(".");
  if (dotIndex === -1) return;
  const themeKey = path.slice(0, dotIndex) as ThemeKey;
  if (
    !(themeKey in theme) ||
    themeKey === "container" ||
    themeKey === "dropShadow"
  ) {
    return;
  }
  const value = theme[themeKey][path.slice(dotIndex + 1)];
  if (!value) return;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0]; // fontSize
  if ("value" in value) return value.value; // boxShadow
  return value.max ?? value.min; // screens
};
