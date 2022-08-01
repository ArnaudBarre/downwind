import { DefineConfig } from "@arnaud-barre/config-loader";
import { CSSModuleExports, Dependency, TransformOptions } from "@parcel/css";
import { Plugin as ESBuildPlugin } from "esbuild";
import { Plugin as VitePlugin } from "vite";

export declare const VERSION: string;

/**
 * Config
 */
export type UserConfig = Partial<{
  theme: Partial<DownwindTheme & { extend: Partial<DownwindTheme> }>;
  corePlugins: Partial<Record<CorePlugin, boolean>>;
  plugins: Rule[] | ((theme: ResolvedTheme) => Rule[]);
}>;
export type DownwindConfig = DefineConfig<UserConfig>;

/**
 * API
 */
export declare const initDownwind: (
  targets?: TransformOptions["targets"],
) => Promise<Downwind>;

export type Downwind = {
  getBase: () => string;
  preTransform: (content: string) => string;
  transform: <AnalyzeDependencies extends boolean>(
    path: string,
    opts?: { analyzeDependencies: AnalyzeDependencies },
  ) => {
    code: string;
    exports: CSSModuleExports | undefined;
    dependencies: AnalyzeDependencies extends true ? Dependency[] : never;
  };
  scan: (path: string, content?: string) => boolean /* hasNew */;
  generate: () => string;
};

export declare const codegen: (opts: {
  omitContent: boolean;
}) => Promise<string>;

export declare const vitePlugin: (
  targets?: TransformOptions["targets"],
) => Promise<VitePlugin[]>;

export declare const esbuildPlugin: (
  targets?: TransformOptions["targets"],
) => ESBuildPlugin;

/**
 * Utils
 */
export declare const cssModuleToJS: (cssModule: CSSModuleExports) => string;

/**
 * Rules
 */
export type Rule = StaticRule | ThemeRule<any> | DirectionThemeRule;
export type StaticRule = [string, CSSEntries, RuleMeta?];
export type ThemeRule<T> = [
  string,
  Record<string, T | undefined>,
  (value: T) => CSSEntries,
  ThemeRuleMeta?,
];
export type DirectionThemeRule = [
  string,
  string[],
  Record<string, string | undefined>,
  (direction: string, value: string) => CSSEntries,
  (ThemeRuleMeta & { omitHyphen?: boolean; mandatory?: boolean })?,
];
export type RuleMeta = {
  /**
   * Can be used to target children: (v) => `${v} > * + *`
   */
  selectorRewrite?: SelectorRewrite;
  /**
   * Set to true to inject this plugin before the core plugins.
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
export type ThemeRuleMeta = RuleMeta & {
  /**
   * Also generate negative entries if the key is a number (like -p-4).
   */
  supportsNegativeValues?: boolean;
  /**
   * Don't generate the class for the DEFAULT key.
   * Used when the DEFAULT value is used in the base styles or in another rule.
   */
  filterDefault?: boolean;
  /**
   * Use null to disable arbitrary values, undefined to allow any value.
   */
  arbitrary?: "color" | null;
};
export type SelectorRewrite = (value: string) => string;
export type CSSEntries = CSSEntry[];
export type CSSEntry = [string, string];

/**
 * Theme
 */
export type ResolvedTheme = Record<
  Exclude<ThemeKey, "screens" | "container" | "fontSize" | "dropShadow">,
  Record<string, string | undefined>
> & {
  screens: Record<string, Screen | undefined>;
  container: Container;
  fontSize: Record<string, string | [string, string] | undefined>;
  dropShadow: Record<string, string | [string, string] | undefined>;
};

export type DownwindTheme = {
  [key in Exclude<
    ThemeKey,
    "screens" | "container" | "colors" | "fontSize" | "dropShadow"
  >]:
    | Record<string, string>
    | ((theme: ThemeCallback) => Record<string, string>);
} & {
  screens: Record<string, string | Screen>;
  container: Container;
  colors: Record<string, string | Record<string, string>>;
  fontSize: Record<string, string | [string, string]>;
  dropShadow: Record<string, string | [string, string]>;
};

export type ThemeCallback = {
  (key: Exclude<ThemeKey, "container" | "dropShadow">): Record<string, string>;
  (key: "screens"): Record<string, Screen>;
};

type Screen = { min: string; max?: string } | { min?: string; max: string };
export type Container = {
  center?: boolean;
  padding?: string | Record<string, string>;
};

export type ThemeKey =
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

export type Default =
  | "transform"
  | "touch-action"
  | "scroll-snap-type"
  | "font-variant-numeric"
  | "ring-width"
  | "filter"
  | "backdrop-filter";

export type CorePlugin =
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
