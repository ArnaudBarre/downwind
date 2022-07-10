import { loadConfig } from "@arnaud-barre/config-loader";

import { baseTheme } from "./theme/baseTheme";
import {
  DownwindTheme,
  CorePlugin,
  UserConfig,
  ResolvedTheme,
  Rule,
  ThemeCallback,
  ThemeKey,
} from "./types";
import { mapObjectValue } from "./utils/helpers";

export type ResolvedConfig = {
  theme: ResolvedTheme;
  corePlugins: Partial<Record<CorePlugin, boolean>>;
  plugins: Rule[];
};

export const getConfig = async () => {
  const config =
    global.TEST_CONFIG ?? (await loadConfig<UserConfig>("downwind"));
  const theme = ((): DownwindTheme => {
    if (!config?.theme) return baseTheme;
    const { extend, ...userTheme } = config.theme;
    if (extend) {
      for (const key in extend) {
        // @ts-ignore
        if (extend[key]) baseTheme[key] = { ...baseTheme[key], ...extend[key] };
      }
    }
    return Object.assign(baseTheme, userTheme);
  })();
  theme.colors = Object.fromEntries(
    Object.entries(theme.colors).flatMap(([key, stringOrMap]) =>
      typeof stringOrMap === "string"
        ? [[key, stringOrMap]]
        : Object.entries(stringOrMap).map(([subKey, value]) => [
            `${key}-${subKey}`,
            value,
          ]),
    ),
  );
  theme.screens = mapObjectValue(theme.screens, (stringOrObj) =>
    typeof stringOrObj === "string" ? { min: stringOrObj } : stringOrObj,
  );
  const themeCallback: ThemeCallback = (key) => {
    if (key === "screens") return theme.screens as any;
    if (key === "fontSize") {
      return mapObjectValue(theme.fontSize, (v) =>
        typeof v === "string" ? v : v[0],
      );
    }
    if (key === "colors") return theme.colors as Record<string, string>;
    const value = theme[key];
    if (typeof value === "object") return value;
    return value(themeCallback);
  };
  for (const key in theme) {
    const value = theme[key as ThemeKey];
    if (typeof value === "function") {
      // @ts-ignore
      theme[key] =
        // Avoid being under ts-ignore
        value(themeCallback);
    }
  }

  const resolvedConfig: ResolvedConfig = {
    theme: theme as ResolvedTheme,
    corePlugins: config?.corePlugins ?? {},
    plugins:
      typeof config?.plugins === "function"
        ? config.plugins(theme as ResolvedTheme)
        : config?.plugins ?? [],
  };
  return resolvedConfig;
};
