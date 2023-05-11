import { DefineConfig } from "@arnaud-barre/config-loader";
import { CSSModuleExports, Dependency, Targets } from "lightningcss";

export declare const VERSION: string;

/**
 * Config
 */
type UserConfig = Partial<{
  theme: Partial<DownwindTheme & { extend: Partial<DownwindTheme> }>;
  coreRules: Partial<Record<CoreRule, boolean>>;
  rules: BaseRule[] | ((theme: ResolvedTheme) => BaseRule[]);
  shortcuts: Record<string, string>;
  safelist: (theme: ResolvedTheme) => string[];
  blocklist: string[];
}>;
export type DownwindConfig = DefineConfig<UserConfig>;

/**
 * API
 */
export declare const initDownwind: (opts?: {
  targets?: Targets;
  scannedExtension?: string;
  root?: string;
}) => Promise<Downwind>;

export type Downwind = {
  getBase: () => string;
  preTransform: (content: string) => {
    invalidateUtils: boolean;
    content: string;
  };
  transform: <AnalyzeDependencies extends boolean = false>(
    path: string,
    opts?: { analyzeDependencies: AnalyzeDependencies },
  ) => {
    invalidateUtils: boolean;
    code: string;
    exports: CSSModuleExports | undefined;
    dependencies: AnalyzeDependencies extends true ? Dependency[] : never;
  };
  scan: (path: string, content?: string) => boolean /* hasNew */;
  generate: (opts?: { skipLightningCSS?: boolean }) => string;
  codegen: (opts: {
    mode: "WITH_CONTENT" | "OMIT_CONTENT" | "DEVTOOLS";
  }) => string;
  configFiles: string[];
};

declare class DownwindError extends Error {
  context: string;
}

/**
 * Utils
 */
export declare const cssModuleToJS: (cssModule: CSSModuleExports) => string;

export declare const convertTargets: (
  esbuildTarget: string | string[] | undefined | false,
) => LightningCSSTargets;

export declare const staticRules: (
  rules: Record<string, Record<string, string>>,
) => StaticRule[];

/**
 * Rules
 */
export type BaseRule = StaticRule | ThemeRule<any> | DirectionThemeRule;
export type StaticRule = [handle: string, entries: CSSEntries, meta?: RuleMeta];
export type ThemeRule<T> = [
  base: string,
  themeMap: Record<string, T | undefined>,
  callback: (value: T) => CSSEntries,
  meta?: ThemeRuleMeta,
];
export type DirectionThemeRule = [
  base: string,
  directions: string[],
  themeMap: Record<string, string | undefined>,
  callback: (direction: string, value: string) => CSSEntries,
  meta?: ThemeRuleMeta & { omitHyphen?: boolean; mandatory?: boolean },
];
type RuleMeta = {
  /**
   * Can be used to target children: (v) => `${v} > *`
   */
  selectorRewrite?: SelectorRewrite;
  /**
   * Set to true to inject this rule before the core rules.
   */
  injectFirst?: boolean;
  /**
   * Inject some CSS variables on `*`. Needed for some rules like transform or filter.
   */
  addDefault?: Default;
  /**
   * @internal
   */
  addContainer?: boolean;
  addKeyframes?: boolean;
};
type ThemeRuleMeta = RuleMeta & {
  /**
   * Also generate negative entries if the key is a number (like -p-4).
   */
  supportsNegativeValues?: boolean;
  /**
   * Don't generate the class for the DEFAULT key.
   * Used when the DEFAULT value is used for the base styles or in another rule.
   */
  filterDefault?: boolean;
  /**
   * Use null to disable arbitrary values, undefined to allow any value.
   */
  arbitrary?: "color-only" | null;
  /**
   * Opacity theme to enable opacity shortcut like text-blue-200/20
   */
  alphaModifiers?: Record<string, string | undefined>;
  /**
   * @internal
   */
  lineHeightModifiers?: boolean;
};
type SelectorRewrite = (value: string) => string;
type CSSEntries = CSSEntry[];
type CSSEntry = [string, string];

/**
 * Theme
 */
type ResolvedTheme = Record<
  Exclude<
    ThemeKey,
    "screens" | "container" | "fontSize" | "boxShadow" | "dropShadow"
  >,
  Record<string, string | undefined>
> & {
  screens: Record<string, Screen>;
  container: Container;
  fontSize: Record<string, string | [string, string] | undefined>;
  boxShadow: Record<string, BoxShadow | undefined>;
  dropShadow: Record<string, string | [string, string] | undefined>;
};

export type DownwindTheme = {
  [key in Exclude<
    ThemeKey,
    "screens" | "container" | "fontSize" | "boxShadow" | "dropShadow"
  >]:
    | Record<string, string>
    | ((theme: ThemeCallback) => Record<string, string>);
} & {
  screens: Record<string, string | Screen>;
  container: Container;
  fontSize: Record<string, string | [string, string]>;
  boxShadow: Record<string, BoxShadow>;
  dropShadow: Record<string, string | [string, string]>;
};

type ThemeCallback = {
  (
    key: Exclude<ThemeKey, "container" | "boxShadow" | "dropShadow">,
  ): Record<string, string>;
  (key: "screens"): Record<string, Screen>;
};

type Screen = { min: string; max?: string } | { min?: string; max: string };
type BoxShadow = string | { value: string; defaultColor: string };
type Container = {
  center?: boolean;
  padding?: string | Record<string, string>;
};

type ThemeKey =
  | "screens"
  | "colors"
  | "columns"
  | "spacing"
  | "animation"
  | "aspectRatio"
  | "backdropBlur"
  | "backdropBrightness"
  | "backdropContrast"
  | "backdropGrayscale"
  | "backdropHueRotate"
  | "backdropInvert"
  | "backdropOpacity"
  | "backdropSaturate"
  | "backdropSepia"
  | "backgroundColor"
  | "backgroundImage"
  | "backgroundOpacity"
  | "backgroundPosition"
  | "backgroundSize"
  | "blur"
  | "brightness"
  | "borderColor"
  | "borderOpacity"
  | "borderRadius"
  | "borderWidth"
  | "boxShadow"
  | "boxShadowColor"
  | "caretColor"
  | "accentColor"
  | "contrast"
  | "container"
  | "content"
  | "divideColor"
  | "divideOpacity"
  | "divideWidth"
  | "dropShadow"
  | "fill"
  | "grayscale"
  | "hueRotate"
  | "invert"
  | "flex"
  | "flexBasis"
  | "flexGrow"
  | "flexShrink"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "gap"
  | "gradientColorStops"
  | "gradientColorStopPositions"
  | "gridAutoColumns"
  | "gridAutoRows"
  | "gridColumn"
  | "gridColumnEnd"
  | "gridColumnStart"
  | "gridRow"
  | "gridRowStart"
  | "gridRowEnd"
  | "gridTemplateColumns"
  | "gridTemplateRows"
  | "height"
  | "inset"
  | "keyframes"
  | "letterSpacing"
  | "lineClamp"
  | "lineHeight"
  | "listStyleType"
  | "listStyleImage"
  | "margin"
  | "maxHeight"
  | "maxWidth"
  | "minHeight"
  | "minWidth"
  | "objectPosition"
  | "opacity"
  | "order"
  | "padding"
  | "placeholderColor"
  | "placeholderOpacity"
  | "outlineColor"
  | "outlineOffset"
  | "outlineWidth"
  | "ringColor"
  | "ringOffsetColor"
  | "ringOffsetWidth"
  | "ringOpacity"
  | "ringWidth"
  | "rotate"
  | "saturate"
  | "scale"
  | "scrollMargin"
  | "scrollPadding"
  | "sepia"
  | "skew"
  | "space"
  | "stroke"
  | "strokeWidth"
  | "supports"
  | "textColor"
  | "textDecorationColor"
  | "textDecorationThickness"
  | "textUnderlineOffset"
  | "textIndent"
  | "textOpacity"
  | "transformOrigin"
  | "transitionDelay"
  | "transitionDuration"
  | "transitionProperty"
  | "transitionTimingFunction"
  | "translate"
  | "verticalAlign"
  | "width"
  | "willChange"
  | "zIndex";

type Default =
  | "transform"
  | "gradient-color-stops"
  | "touch-action"
  | "scroll-snap-type"
  | "font-variant-numeric"
  | "ring-width"
  | "filter"
  | "backdrop-filter";

type CoreRule =
  | "container"
  | "accessibility"
  | "pointerEvents"
  | "visibility"
  | "position"
  | "inset"
  | "isolation"
  | "zIndex"
  | "order"
  | "gridColumn"
  | "gridColumnStart"
  | "gridColumnEnd"
  | "gridRow"
  | "gridRowStart"
  | "gridRowEnd"
  | "float"
  | "clear"
  | "boxSizing"
  | "display"
  | "aspectRatio"
  | "height"
  | "maxHeight"
  | "minHeight"
  | "width"
  | "minWidth"
  | "maxWidth"
  | "flex"
  | "flexShrink"
  | "flexGrow"
  | "flexBasis"
  | "tableLayout"
  | "captionSide"
  | "borderCollapse"
  | "transformOrigin"
  | "translate"
  | "rotate"
  | "skew"
  | "scale"
  | "transform"
  | "animation"
  | "cursor"
  | "touchAction"
  | "userSelect"
  | "resize"
  | "scrollSnapType"
  | "scrollSnapAlign"
  | "scrollSnapStop"
  | "scrollMargin"
  | "scrollPadding"
  | "listStylePosition"
  | "listStyleType"
  | "listStyleImage"
  | "appearance"
  | "columns"
  | "breakBefore"
  | "breakInside"
  | "breakAfter"
  | "gridAutoColumns"
  | "gridAutoFlow"
  | "gridAutoRows"
  | "gridTemplateColumns"
  | "gridTemplateRows"
  | "flexDirection"
  | "flexWrap"
  | "placeContent"
  | "placeItems"
  | "alignContent"
  | "alignItems"
  | "justifyContent"
  | "justifyItems"
  | "gap"
  | "space"
  | "margin"
  | "divideWidth"
  | "divideStyle"
  | "divideColor"
  | "divideOpacity"
  | "placeSelf"
  | "alignSelf"
  | "justifySelf"
  | "overflow"
  | "overscrollBehavior"
  | "scrollBehavior"
  | "textOverflow"
  | "hyphens"
  | "whitespace"
  | "wordBreak"
  | "borderRadius"
  | "borderWidth"
  | "borderStyle"
  | "borderColor"
  | "borderOpacity"
  | "backgroundColor"
  | "backgroundOpacity"
  | "backgroundImage"
  | "gradientColorStops"
  | "boxDecorationBreak"
  | "backgroundSize"
  | "backgroundAttachment"
  | "backgroundClip"
  | "backgroundPosition"
  | "backgroundRepeat"
  | "backgroundOrigin"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "objectFit"
  | "objectPosition"
  | "padding"
  | "textAlign"
  | "textIndent"
  | "verticalAlign"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "textTransform"
  | "fontStyle"
  | "fontVariantNumeric"
  | "lineHeight"
  | "letterSpacing"
  | "textColor"
  | "textOpacity"
  | "textDecoration"
  | "textDecorationColor"
  | "textDecorationStyle"
  | "textDecorationThickness"
  | "textUnderlineOffset"
  | "fontSmoothing"
  | "placeholderColor"
  | "placeholderOpacity"
  | "caretColor"
  | "accentColor"
  | "opacity"
  | "backgroundBlendMode"
  | "mixBlendMode"
  | "boxShadow"
  | "boxShadowColor"
  | "outlineStyle"
  | "outlineWidth"
  | "outlineOffset"
  | "outlineColor"
  | "ringWidth"
  | "ringColor"
  | "ringOpacity"
  | "ringOffsetWidth"
  | "ringOffsetColor"
  | "blur"
  | "brightness"
  | "contrast"
  | "dropShadow"
  | "grayscale"
  | "hueRotate"
  | "invert"
  | "saturate"
  | "sepia"
  | "filter"
  | "backdropBlur"
  | "backdropBrightness"
  | "backdropContrast"
  | "backdropGrayscale"
  | "backdropHueRotate"
  | "backdropInvert"
  | "backdropOpacity"
  | "backdropSaturate"
  | "backdropSepia"
  | "backdropFilter"
  | "transitionProperty"
  | "transitionDelay"
  | "transitionDuration"
  | "transitionTimingFunction"
  | "willChange"
  | "content"
  | "lineClamp";
