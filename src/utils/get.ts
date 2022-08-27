import { ResolvedTheme, ThemeKey } from "../types";

export const get = (theme: ResolvedTheme, path: string) => {
  const dotIndex = path.indexOf(".");
  const bracketIndex = path.indexOf("[");
  const keyIndex =
    dotIndex === -1
      ? bracketIndex
      : bracketIndex === -1
      ? dotIndex
      : Math.min(dotIndex, bracketIndex);
  if (keyIndex === -1) return;
  const themeKey = path.slice(0, keyIndex) as ThemeKey;
  if (
    !(themeKey in theme) ||
    themeKey === "container" ||
    themeKey === "dropShadow"
  ) {
    return;
  }
  const valueKey =
    path[keyIndex] === "."
      ? path.slice(keyIndex + 1)
      : path.slice(keyIndex + 1, -1); // Support spacing[2.5]
  const value = theme[themeKey][valueKey];
  if (!value) return;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0]; // fontSize
  if ("value" in value) return value.value; // boxShadow
  return value.max ?? value.min; // screens
};
