import { getBaseTheme } from "./theme/getBaseTheme.ts";
import type {
  BaseRule,
  CoreRule,
  DownwindTheme,
  ResolvedTheme,
  ThemeCallback,
  ThemeKey,
  UserConfig,
} from "./types.d.ts";
import { mapObjectValue, run } from "./utils/helpers.ts";

export type ResolvedConfig = {
  theme: ResolvedTheme;
  coreRules: Partial<Record<CoreRule, boolean>>;
  rules: BaseRule[];
  shortcuts: Record<string, string>;
  safelist: string[];
  blocklist: string[];
};

export const resolveConfig = (
  config: UserConfig | undefined,
): ResolvedConfig => {
  const theme = run((): DownwindTheme => {
    const baseTheme = getBaseTheme();
    if (!config?.theme) return baseTheme;
    const { extend, ...userTheme } = config.theme;
    if (extend) {
      for (const key in extend) {
        const ext = extend[key as ThemeKey];
        if (!ext) continue;
        const current = baseTheme[key as ThemeKey];
        // @ts-expect-error
        baseTheme[key] =
          typeof current === "object" && typeof ext === "object"
            ? { ...current, ...ext }
            : (cb: ThemeCallback) => ({
                ...(typeof current === "object" ? current : current(cb)),
                ...(typeof ext === "object" ? ext : ext(cb)),
              });
      }
    }
    return Object.assign(baseTheme, userTheme);
  });
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
    const value = theme[key];
    if (typeof value === "object") return value;
    return value(themeCallback);
  };
  for (const key in theme) {
    const value = theme[key as ThemeKey];
    if (typeof value === "function") {
      // @ts-expect-error
      theme[key] =
        // Avoid being under ts-ignore
        value(themeCallback);
    }
  }

  return {
    theme: theme as ResolvedTheme,
    coreRules: config?.coreRules ?? {},
    rules:
      typeof config?.rules === "function"
        ? config.rules(theme as ResolvedTheme)
        : config?.rules ?? [],
    shortcuts: config?.shortcuts ?? {},
    safelist: config?.safelist?.(theme as ResolvedTheme) ?? [],
    blocklist: config?.blocklist ?? [],
  };
};
