import type { ResolvedConfig } from "./resolveConfig.ts";
import type {
  BaseRule,
  CoreRule,
  CSSEntries,
  CSSEntry,
  DirectionThemeRule,
  SelectorRewrite,
  StaticRule,
  ThemeRule,
  ThemeRuleMeta,
} from "./types.d.ts";
import { withAlphaValue, withAlphaVariable } from "./utils/colors.ts";

export type BaseRuleOrBaseRules = BaseRule | BaseRule[];

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
export const getCoreRules = ({
  theme,
  coreRules,
}: ResolvedConfig): {
  [key in CoreRule]: BaseRuleOrBaseRules;
} => ({
  container: ["container", [], { addContainer: true }],
  accessibility: [
    [
      "sr-only",
      [
        ["position", "absolute"],
        ["width", "1px"],
        ["height", "1px"],
        ["padding", "0"],
        ["margin", "-1px"],
        ["overflow", "hidden"],
        ["clip", "rect(0, 0, 0, 0)"],
        ["white-space", "nowrap"],
        ["border-width", "0"],
      ],
    ],
    [
      "not-sr-only",
      [
        ["position", "static"],
        ["width", "auto"],
        ["height", "auto"],
        ["padding", "0"],
        ["margin", "0"],
        ["overflow", "visible"],
        ["clip", "auto"],
        ["white-space", "normal"],
      ],
    ],
  ],
  pointerEvents: [
    ["pointer-events-auto", [["pointer-events", "auto"]]],
    ["pointer-events-none", [["pointer-events", "none"]]],
  ],
  visibility: [
    ["visible", [["visibility", "visible"]]],
    ["invisible", [["visibility", "hidden"]]],
    ["collapse", [["visibility", "collapse"]]],
  ],
  position: enumRule("", "position", [
    "static",
    "fixed",
    "absolute",
    "relative",
    "sticky",
  ]),
  inset: [
    directionThemeRule(
      "inset",
      ["x", "y", "tr", "br", "bl", "tl"], // https://github.com/tailwindlabs/tailwindcss/discussions/7706
      theme.inset,
      (d) =>
        ({
          all: ["inset"],
          x: ["left", "right"],
          y: ["top", "bottom"],
          tr: ["top", "right"],
          br: ["bottom", "right"],
          bl: ["bottom", "left"],
          tl: ["top", "left"],
        })[d],
      { supportsNegativeValues: true },
    ),
    themeRule("top", theme.inset, "top", { supportsNegativeValues: true }),
    themeRule("right", theme.inset, "right", { supportsNegativeValues: true }),
    themeRule("bottom", theme.inset, "bottom", {
      supportsNegativeValues: true,
    }),
    themeRule("left", theme.inset, "left", { supportsNegativeValues: true }),
  ],
  isolation: [
    ["isolate", [["isolation", "isolate"]]],
    ["isolation-auto", [["isolation", "auto"]]],
  ],
  zIndex: themeRule("z", theme.zIndex, "z-index", {
    supportsNegativeValues: true,
  }),
  order: themeRule("order", theme.order, "order", {
    supportsNegativeValues: true,
  }),
  gridColumn: themeRule("col", theme.gridColumn, "grid-column"),
  gridColumnStart: themeRule(
    "col-start",
    theme.gridColumnStart,
    "grid-column-start",
    { supportsNegativeValues: true },
  ),
  gridColumnEnd: themeRule("col-end", theme.gridColumnEnd, "grid-column-end", {
    supportsNegativeValues: true,
  }),
  gridRow: themeRule("row", theme.gridRow, "grid-row"),
  gridRowStart: themeRule("row-start", theme.gridRowStart, "grid-row-start", {
    supportsNegativeValues: true,
  }),
  gridRowEnd: themeRule("row-end", theme.gridRowEnd, "grid-row-end", {
    supportsNegativeValues: true,
  }),
  float: [
    ["float-start", [["float", "inline-start"]]],
    ["float-end", [["float", "inline-end"]]],
    ["float-right", [["float", "right"]]],
    ["float-left", [["float", "left"]]],
    ["float-none", [["float", "none"]]],
  ],
  clear: [
    ["clear-start", [["clear", "inline-start"]]],
    ["clear-end", [["clear", "inline-end"]]],
    ["clear-left", [["clear", "left"]]],
    ["clear-right", [["clear", "right"]]],
    ["clear-both", [["clear", "both"]]],
    ["clear-none", [["clear", "none"]]],
  ],
  boxSizing: enumRule("box-", "box-sizing", ["border-box", "content-box"]),
  lineClamp: [
    themeRule("line-clamp", theme.lineClamp, [
      ["overflow", "hidden"],
      ["display", "-webkit-box"],
      ["-webkit-box-orient", "vertical"],
      "-webkit-line-clamp",
    ]),
    [
      "line-clamp-none",
      [
        ["overflow", "visible"],
        ["display", "block"],
        ["-webkit-box-orient", "horizontal"],
        ["-webkit-line-clamp", "none"],
      ],
    ],
  ],
  display: enumRule(
    "",
    "display",
    [
      "block",
      "inline-block",
      "inline",
      "flex",
      "inline-flex",
      "table",
      "inline-table",
      "table-caption",
      "table-cell",
      "table-column",
      "table-column-group",
      "table-footer-group",
      "table-header-group",
      "table-row-group",
      "table-row",
      "flow-root",
      "grid",
      "inline-grid",
      "contents",
      "list-item",
      "hidden",
    ],
    (v) => (v === "hidden" ? "none" : v),
  ),
  aspectRatio: themeRule("aspect", theme.aspectRatio, "aspect-ratio"),
  size: themeRule("size", theme.size, ["width", "height"]),
  height: themeRule("h", theme.height, "height"),
  maxHeight: themeRule("min-h", theme.minHeight, "min-height"),
  minHeight: themeRule("max-h", theme.maxHeight, "max-height"),
  width: themeRule("w", theme.width, "width"),
  minWidth: themeRule("min-w", theme.minWidth, "min-width"),
  maxWidth: themeRule("max-w", theme.maxWidth, "max-width"),
  flex: themeRule("flex", theme.flex, "flex"),
  flexShrink: themeRule("shrink", theme.flexShrink, "flex-shrink"),
  flexGrow: themeRule("grow", theme.flexGrow, "flex-grow"),
  flexBasis: themeRule("basis", theme.flexBasis, "flex-basis"),
  tableLayout: enumRule("table-", "table-layout", ["auto", "fixed"]),
  captionSide: enumRule("caption-", "caption-side", ["top", "bottom"]),
  borderCollapse: enumRule("border-", "border-collapse", [
    "collapse",
    "separate",
  ]),
  transformOrigin: themeRule(
    "origin",
    theme.transformOrigin,
    "transform-origin",
  ),
  translate: directionThemeRule(
    "translate",
    ["x", "y"],
    theme.translate,
    (d) => [`--tw-translate-${d}`, ["transform", cssTransformValue]],
    { supportsNegativeValues: true, addDefault: "transform", mandatory: true },
  ),
  rotate: themeRule(
    "rotate",
    theme.rotate,
    ["--tw-rotate", ["transform", cssTransformValue]],
    { supportsNegativeValues: true, addDefault: "transform" },
  ),
  skew: directionThemeRule(
    "skew",
    ["x", "y"],
    theme.skew,
    (d) => [`--tw-skew-${d}`, ["transform", cssTransformValue]],
    { supportsNegativeValues: true, addDefault: "transform", mandatory: true },
  ),
  scale: directionThemeRule(
    "scale",
    ["x", "y"],
    theme.scale,
    (d) => [
      ...(d === "all" ? ["--tw-scale-x", "--tw-scale-y"] : [`--tw-scale-${d}`]),
      ["transform", cssTransformValue],
    ],
    { supportsNegativeValues: true, addDefault: "transform" },
  ),
  // Non-compliant: Doesn't ship default useless transform[-cpu]
  transform: [
    [
      "transform-gpu",
      [
        [
          "transform",
          cssTransformValue.replace(
            "translate(var(--tw-translate-x), var(--tw-translate-y))",
            "translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)",
          ),
        ],
      ],
    ],
    ["transform-none", [["transform", "none"]]],
  ],
  // Non-compliant: Only handles references to first keyframes & uses stings for theme.keyframes
  animation: themeRule("animate", theme.animation, "animation", {
    addKeyframes: true,
  }),
  // Non-compliant: Don't use theme
  cursor: enumRule("cursor-", "cursor", [
    "auto",
    "default",
    "pointer",
    "wait",
    "text",
    "move",
    "help",
    "not-allowed",
    "none",
    "context-menu",
    "progress",
    "cell",
    "crosshair",
    "vertical-text",
    "alias",
    "copy",
    "no-drop",
    "grab",
    "grabbing",
    "all-scroll",
    "col-resize",
    "row-resize",
    "n-resize",
    "e-resize",
    "s-resize",
    "w-resize",
    "ne-resize",
    "nw-resize",
    "se-resize",
    "sw-resize",
    "ew-resize",
    "ns-resize",
    "nesw-resize",
    "nwse-resize",
    "zoom-in",
    "zoom-out",
  ]),
  touchAction: [
    ["touch-auto", [["touch-action", "auto"]]],
    ["touch-none", [["touch-action", "none"]]],
    touchActionRule("pan-x", "--tw-pan-x"),
    touchActionRule("pan-left", "--tw-pan-x"),
    touchActionRule("pan-right", "--tw-pan-x"),
    touchActionRule("pan-y", "--tw-pan-y"),
    touchActionRule("pan-up", "--tw-pan-y"),
    touchActionRule("pan-down", "--tw-pan-y"),
    touchActionRule("pinch-zoom", "--tw-pinch-zoom"),
    ["touch-manipulation", [["touch-action", "manipulation"]]],
  ],
  userSelect: enumRule("select-", "user-select", [
    "auto",
    "all",
    "text",
    "none",
  ]),
  resize: [
    ["resize-x", [["resize", "horizontal"]]],
    ["resize-y", [["resize", "vertical"]]],
    ["resize", [["resize", "both"]]],
    ["resize-none", [["resize", "none"]]],
  ],
  scrollSnapType: [
    ["snap-none", [["scroll-snap-type", "none"]]],
    [
      "snap-x",
      [["scroll-snap-type", "x var(--tw-scroll-snap-strictness)"]],
      { addDefault: "scroll-snap-type" },
    ] satisfies BaseRule,
    [
      "snap-y",
      [["scroll-snap-type", "y var(--tw-scroll-snap-strictness)"]],
      { addDefault: "scroll-snap-type" },
    ],
    [
      "snap-both",
      [["scroll-snap-type", "both var(--tw-scroll-snap-strictness)"]],
      { addDefault: "scroll-snap-type" },
    ],
    ["snap-mandatory", [["--tw-scroll-snap-strictness", "mandatory"]]],
    ["snap-proximity", [["--tw-scroll-snap-strictness", "proximity"]]],
  ],
  scrollSnapAlign: enumRule("snap-", "scroll-snap-align", [
    "start",
    "end",
    "center",
    "align-none",
  ]),
  scrollSnapStop: enumRule("snap-", "scroll-snap-stop", ["normal", "always"]),
  scrollMargin: directionThemeRule(
    "scroll-m",
    standardDirections,
    theme.scrollMargin,
    (d) => suffixDirection("scroll-margin", d),
    { supportsNegativeValues: true, omitHyphen: true },
  ),
  scrollPadding: directionThemeRule(
    "scroll-p",
    standardDirections,
    theme.scrollPadding,
    (d) => suffixDirection("scroll-padding", d),
    { omitHyphen: true },
  ),
  listStylePosition: enumRule("list-", "list-style-position", [
    "inside",
    "outside",
  ]),
  listStyleType: themeRule("list", theme.listStyleType, "list-style-type"),
  listStyleImage: themeRule(
    "list-image",
    theme.listStyleImage,
    "list-style-image",
  ),
  appearance: [
    ["appearance-none", [["appearance", "none"]]],
    ["appearance-auto", [["appearance", "auto"]]],
  ],
  columns: themeRule("columns", theme.columns, "columns"),
  breakBefore: enumRule("break-before-", "break-before", breaks),
  breakInside: enumRule("break-inside-", "break-inside", [
    "auto",
    "avoid",
    "avoid-page",
    "avoid-column",
  ]),
  breakAfter: enumRule("break-after-", "break-after", breaks),
  gridAutoColumns: themeRule(
    "auto-cols",
    theme.gridAutoColumns,
    "grid-auto-columns",
  ),
  gridAutoFlow: enumRule(
    "grid-flow-",
    "grid-auto-flow",
    ["row", "column", "row-dense", "column-dense"],
    (v) => v.split("-").join(" "),
  ),
  gridAutoRows: themeRule("auto-rows", theme.gridAutoRows, "grid-auto-rows"),
  gridTemplateColumns: themeRule(
    "grid-cols",
    theme.gridTemplateColumns,
    "grid-template-columns",
  ),
  gridTemplateRows: themeRule(
    "grid-rows",
    theme.gridTemplateRows,
    "grid-template-rows",
  ),
  // Non-compliant: Adding display flex when it will always be required
  flexDirection: [
    ["flex-row", [["flex-direction", "row"]]],
    [
      "flex-row-reverse",
      [
        ["display", "flex"],
        ["flex-direction", "row-reverse"],
      ],
    ],
    [
      "flex-col",
      [
        ["display", "flex"],
        ["flex-direction", "column"],
      ],
    ],
    [
      "flex-col-reverse",
      [
        ["display", "flex"],
        ["flex-direction", "column-reverse"],
      ],
    ],
  ],
  // Non-compliant: Adding display flex when it will always be required
  flexWrap: [
    [
      "flex-wrap",
      [
        ["display", "flex"],
        ["flex-wrap", "wrap"],
      ],
    ],
    [
      "flex-wrap-reverse",
      [
        ["display", "flex"],
        ["flex-wrap", "wrap-reverse"],
      ],
    ],
    ["flex-nowrap", [["flex-wrap", "nowrap"]]],
  ],
  placeContent: enumRule(
    "place-content-",
    "place-content",
    [
      "center",
      "start",
      "end",
      "between",
      "around",
      "evenly",
      "baseline",
      "stretch",
    ],
    prefixSpace,
  ),
  placeItems: enumRule("place-items-", "place-items", [
    "start",
    "end",
    "center",
    "baseline",
    "stretch",
  ]),
  alignContent: enumRule(
    "content-",
    "align-content",
    [
      "normal",
      "start",
      "end",
      "center",
      "between",
      "around",
      "evenly",
      "baseline",
      "stretch",
    ],
    (v) => prefixSpace(prefixFlex(v)),
  ),
  alignItems: enumRule(
    "items-",
    "align-items",
    ["start", "end", "center", "baseline", "stretch"],
    prefixFlex,
  ),
  justifyContent: enumRule(
    "justify-",
    "justify-content",
    [
      "normal",
      "start",
      "end",
      "center",
      "between",
      "around",
      "evenly",
      "stretch",
    ],
    (v) => prefixSpace(prefixFlex(v)),
  ),
  justifyItems: enumRule("justify-items-", "justify-items", [
    "start",
    "end",
    "center",
    "stretch",
  ]),
  gap: [
    themeRule("gap", theme.gap, "gap"),
    themeRule("gap-x", theme.gap, "column-gap"),
    themeRule("gap-y", theme.gap, "row-gap"),
  ],
  space: [
    directionThemeRule(
      "space",
      ["x", "y"],
      theme.space,
      (d) => (d === "x" ? ["margin-left"] : ["margin-top"]),
      {
        supportsNegativeValues: true,
        mandatory: true,
        selectorRewrite: siblingChildrenSelectorRewrite,
      },
    ),
    // Non-compliant version for https://tailwindcss.com/docs/space#reversing-children-order
    directionThemeRule(
      "space-reverse",
      ["x", "y"],
      theme.space,
      (d) => (d === "x" ? ["margin-right"] : ["margin-bottom"]),
      {
        supportsNegativeValues: true,
        mandatory: true,
        selectorRewrite: siblingChildrenSelectorRewrite,
      },
    ),
  ],
  // Non-compliant order: Allow margin to override space
  margin: directionThemeRule(
    "m",
    standardDirections,
    theme.margin,
    (d) => suffixDirection("margin", d),
    { supportsNegativeValues: true, omitHyphen: true },
  ),
  divideWidth: [
    themeRule("divide-x", theme.divideWidth, "border-left-width", {
      selectorRewrite: siblingChildrenSelectorRewrite,
    }),
    themeRule("divide-y", theme.divideWidth, "border-top-width", {
      selectorRewrite: siblingChildrenSelectorRewrite,
    }),
    // Non-compliant version for https://tailwindcss.com/docs/divide-width#reversing-children-order
    themeRule("divide-reverse-x", theme.divideWidth, "border-right-width", {
      selectorRewrite: siblingChildrenSelectorRewrite,
    }),
    themeRule("divide-reverse-y", theme.divideWidth, "border-bottom-width", {
      selectorRewrite: siblingChildrenSelectorRewrite,
    }),
  ],
  divideStyle: enumRule(
    "divide-",
    "border-style",
    ["solid", "dashed", "dotted", "double", "none"],
    undefined,
    siblingChildrenSelectorRewrite,
  ),
  divideColor: themeRule(
    "divide",
    theme.divideColor,
    (value) =>
      withAlphaVariable({
        properties: ["border-color"],
        color: value,
        variable: "--tw-divide-opacity",
        enabled: coreRules.divideOpacity !== false,
      }),
    {
      selectorRewrite: siblingChildrenSelectorRewrite,
      arbitrary: "color-only",
      alphaModifiers:
        coreRules.divideOpacity === false ? undefined : theme.divideOpacity,
    },
  ),
  divideOpacity: themeRule(
    "divide",
    theme.divideOpacity,
    "--tw-divide-opacity",
    { selectorRewrite: siblingChildrenSelectorRewrite },
  ),
  placeSelf: enumRule("place-self-", "place-self", [
    "auto",
    "start",
    "end",
    "center",
    "stretch",
  ]),
  alignSelf: enumRule(
    "self-",
    "align-self",
    ["auto", "start", "end", "center", "stretch", "baseline"],
    prefixFlex,
  ),
  justifySelf: enumRule("justify-self-", "justify-self", [
    "auto",
    "start",
    "end",
    "center",
    "stretch",
  ]),
  overflow: [
    ...enumRule("overflow-", "overflow", overflows),
    ...enumRule("overflow-x-", "overflow-x", overflows),
    ...enumRule("overflow-y-", "overflow-y", overflows),
  ],
  overscrollBehavior: [
    ...enumRule("overscroll-", "overscroll", overscrolls),
    ...enumRule("overscroll-x-", "overscroll-x", overscrolls),
    ...enumRule("overscroll-y-", "overscroll-y", overscrolls),
  ],
  scrollBehavior: enumRule("scroll-", "scroll-behavior", ["auto", "smooth"]),
  textOverflow: [
    [
      "truncate",
      [
        ["overflow", "hidden"],
        ["text-overflow", "ellipsis"],
        ["white-space", "nowrap"],
      ],
    ],
    ["text-ellipsis", [["text-overflow", "ellipsis"]]],
    ["text-clip", [["text-overflow", "clip"]]],
  ],
  hyphens: enumRule("hyphens-", "hyphens", ["none", "manual", "auto"]),
  whitespace: enumRule("whitespace-", "white-space", [
    "normal",
    "nowrap",
    "pre",
    "pre-line",
    "pre-wrap",
    "break-spaces",
  ]),
  textWrap: [
    ["text-wrap", [["text-wrap", "wrap"]]],
    ["text-nowrap", [["text-wrap", "nowrap"]]],
    ["text-balance", [["text-wrap", "balance"]]],
  ],
  wordBreak: [
    [
      "break-normal",
      [
        ["overflow-wrap", "normal"],
        ["word-break", "normal"],
      ],
    ],
    ["break-words", [["overflow-wrap", "break-word"]]],
    ["break-all", [["word-break", "break-all"]]],
    ["break-keep", [["word-break", "keep-all"]]],
  ],
  borderRadius: directionThemeRule(
    "rounded",
    ["t", "r", "l", "b", "tr", "br", "bl", "tl"],
    theme.borderRadius,
    (d) => borderRadiusDirectionMap[d],
  ),
  borderWidth: directionThemeRule(
    "border",
    standardDirections,
    theme.borderWidth,
    (d) => borderWidthDirectionMap[d],
  ),
  borderStyle: enumRule("border-", "border-style", [
    "solid",
    "dashed",
    "dotted",
    "double",
    "hidden",
    "none",
  ]),
  borderColor: directionThemeRule(
    "border",
    standardDirections,
    theme.borderColor,
    (d, value) =>
      withAlphaVariable({
        properties: directionSuffixMap[d].map((dir) => `border${dir}-color`),
        color: value,
        variable: "--tw-border-opacity",
        enabled: coreRules.borderOpacity !== false,
      }),
    {
      filterDefault: true,
      arbitrary: "color-only",
      alphaModifiers:
        coreRules.borderOpacity === false ? undefined : theme.borderOpacity,
    },
  ),
  borderOpacity: themeRule(
    "border-opacity",
    theme.borderOpacity,
    "--tw-border-opacity",
  ),
  backgroundColor: themeRule(
    "bg",
    theme.backgroundColor,
    (value) =>
      withAlphaVariable({
        properties: ["background-color"],
        color: value,
        variable: "--tw-bg-opacity",
        enabled: coreRules.backgroundOpacity !== false,
      }),
    {
      arbitrary: "color-only",
      alphaModifiers:
        coreRules.backgroundOpacity === false
          ? undefined
          : theme.backgroundOpacity,
    },
  ),
  backgroundOpacity: themeRule(
    "bg-opacity",
    theme.backgroundOpacity,
    "--tw-bg-opacity",
  ),
  backgroundImage: themeRule("bg", theme.backgroundImage, "background-image", {
    arbitrary: null,
  }),
  gradientColorStops: [
    themeRule(
      "from",
      theme.gradientColorStops,
      (value) => [
        ["--tw-gradient-from", `${value} var(--tw-gradient-from-position)`],
        [
          "--tw-gradient-to",
          `${transparentTo(value)} var(--tw-gradient-to-position)`,
        ],
        [
          "--tw-gradient-stops",
          "var(--tw-gradient-from), var(--tw-gradient-to)",
        ],
      ],
      {
        arbitrary: "color-only",
        alphaModifiers: theme.opacity,
        addDefault: "gradient-color-stops",
      },
    ),
    themeRule(
      "from",
      theme.gradientColorStopPositions,
      "--tw-gradient-from-position",
    ),
    themeRule(
      "via",
      theme.gradientColorStops,
      (value) => [
        [
          "--tw-gradient-to",
          `${transparentTo(value)} var(--tw-gradient-to-position)`,
        ],
        [
          "--tw-gradient-stops",
          `var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
        ],
      ],
      {
        arbitrary: "color-only",
        alphaModifiers: theme.opacity,
        addDefault: "gradient-color-stops",
      },
    ),
    themeRule(
      "via",
      theme.gradientColorStopPositions,
      "--tw-gradient-via-position",
    ),
    themeRule(
      "to",
      theme.gradientColorStops,
      (value) => [
        ["--tw-gradient-to", `${value} var(--tw-gradient-to-position)`],
      ],
      {
        arbitrary: "color-only",
        alphaModifiers: theme.opacity,
        addDefault: "gradient-color-stops",
      },
    ),
    themeRule(
      "to",
      theme.gradientColorStopPositions,
      "--tw-gradient-to-position",
    ),
  ],
  // Non-compliant: Remove deprecated decoration-(slice|clone)
  boxDecorationBreak: enumRule("box-decoration-", "box-decoration-break", [
    "slice",
    "clone",
  ]),
  backgroundSize: themeRule("bg", theme.backgroundSize, "background-size"),
  backgroundAttachment: enumRule("bg-", "background-attachment", [
    "fixed",
    "local",
    "scroll",
  ]),
  backgroundClip: enumRule("bg-clip-", "background-clip", [
    "border",
    "padding",
    "content",
    "text",
  ]),
  backgroundPosition: themeRule(
    "bg",
    theme.backgroundPosition,
    "background-position",
    { arbitrary: null },
  ),
  backgroundRepeat: [
    ...enumRule("bg-", "background-repeat", [
      "repeat",
      "no-repeat",
      "repeat-x",
      "repeat-y",
    ]),
    ...enumRule("bg-repeat-", "background-repeat", ["round", "space"]),
  ],
  backgroundOrigin: enumRule(
    "bg-origin-",
    "background-origin",
    ["border", "padding", "content"],
    (v) => `${v}-box`,
  ),
  fill: themeRule("fill", theme.fill, "fill", {
    alphaModifiers: theme.opacity,
  }),
  stroke: themeRule("stroke", theme.stroke, "stroke", {
    arbitrary: "color-only",
    alphaModifiers: theme.opacity,
  }),
  strokeWidth: themeRule("stroke", theme.strokeWidth, "stroke-width"),
  objectFit: enumRule("object-", "object-fit", [
    "contain",
    "cover",
    "fill",
    "none",
    "scale-down",
  ]),
  objectPosition: themeRule("object", theme.objectPosition, "object-position"),
  padding: directionThemeRule(
    "p",
    standardDirections,
    theme.padding,
    (d) => suffixDirection("padding", d),
    { supportsNegativeValues: true, omitHyphen: true },
  ),
  textAlign: enumRule("text-", "text-align", [
    "left",
    "center",
    "right",
    "justify",
  ]),
  textIndent: themeRule("indent", theme.textIndent, "text-indent", {
    supportsNegativeValues: true,
  }),
  // Non-compliant: uses theme
  verticalAlign: themeRule("align", theme.verticalAlign, "vertical-align"),
  fontFamily: themeRule("font", theme.fontFamily, "font-family", {
    arbitrary: null,
  }),
  // Non-compliant: Doesn't handle { lineHeight, letterSpacing } format
  fontSize: complexThemeRule(
    "text",
    theme.fontSize,
    (value) => {
      if (Array.isArray(value)) {
        return [
          ["font-size", value[0]],
          ["line-height", value[1]],
        ];
      }
      return [["font-size", value]];
    },
    { lineHeightModifiers: true },
  ),
  fontWeight: themeRule("font", theme.fontWeight, "font-weight"),
  textTransform: enumRule(
    "",
    "text-transform",
    ["uppercase", "lowercase", "capitalize", "normal-case"],
    (v) => (v === "normal-case" ? "none" : v),
  ),
  fontStyle: [
    ["italic", [["font-style", "italic"]]],
    ["not-italic", [["font-style", "normal"]]],
  ],
  fontVariantNumeric: [
    ["normal-nums", [["font-variant-numeric", "normal"]]],
    ...[
      ["--tw-ordinal", "ordinal"],
      ["--tw-slashed-zero", "slashed-zero"],
      ["--tw-numeric-figure", "lining-nums"],
      ["--tw-numeric-figure", "oldstyle-nums"],
      ["--tw-numeric-spacing", "proportional-nums"],
      ["--tw-numeric-spacing", "tabular-nums"],
      ["--tw-numeric-fraction", "diagonal-fractions"],
      ["--tw-numeric-fraction", "stacked-fractions"],
    ].map(
      ([variable, value]): BaseRule => [
        value,
        [
          [variable, value],
          [
            "font-variant-numeric",
            "var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)",
          ],
        ],
        { addDefault: "font-variant-numeric" },
      ],
    ),
  ],
  lineHeight: themeRule("leading", theme.lineHeight, "line-height"),
  letterSpacing: themeRule("tracking", theme.letterSpacing, "letter-spacing", {
    supportsNegativeValues: true,
  }),
  textColor: themeRule(
    "text",
    theme.textColor,
    (value) =>
      withAlphaVariable({
        properties: ["color"],
        color: value,
        variable: "--tw-text-opacity",
        enabled: coreRules.textOpacity !== false,
      }),
    {
      arbitrary: "color-only",
      alphaModifiers:
        coreRules.textOpacity === false ? undefined : theme.textOpacity,
    },
  ),
  textOpacity: themeRule(
    "text-opacity",
    theme.textOpacity,
    "--tw-text-opacity",
  ),
  textDecoration: enumRule(
    "",
    "text-decoration-line",
    ["underline", "overline", "line-through", "no-underline"],
    (v) => (v === "no-underline" ? "none" : v),
  ),
  textDecorationColor: themeRule(
    "decoration",
    theme.textDecorationColor,
    "text-decoration-color",
    { arbitrary: "color-only", alphaModifiers: theme.opacity },
  ),
  textDecorationStyle: enumRule("decoration-", "text-decoration-style", [
    "solid",
    "double",
    "dotted",
    "dashed",
    "wavy",
  ]),
  textDecorationThickness: themeRule(
    "decoration",
    theme.textDecorationThickness,
    "text-decoration-thickness",
  ),
  textUnderlineOffset: themeRule(
    "underline-offset",
    theme.textUnderlineOffset,
    "text-underline-offset",
  ),
  fontSmoothing: [
    [
      "antialiased",
      [
        ["-webkit-font-smoothing", "antialiased"],
        ["-moz-osx-font-smoothing", "grayscale"],
      ],
    ],
    [
      "subpixel-antialiased",
      [
        ["-webkit-font-smoothing", "auto"],
        ["-moz-osx-font-smoothing", "auto"],
      ],
    ],
  ],
  placeholderColor: themeRule(
    "placeholder",
    theme.placeholderColor,
    (value) =>
      withAlphaVariable({
        properties: ["color"],
        color: value,
        variable: "--tw-placeholder-opacity",
        enabled: coreRules.placeholderOpacity !== false,
      }),
    {
      selectorRewrite: (value) => `${value}::placeholder`,
      alphaModifiers:
        coreRules.placeholderOpacity === false
          ? undefined
          : theme.placeholderOpacity,
    },
  ),
  placeholderOpacity: themeRule(
    "placeholder-opacity",
    theme.placeholderOpacity,
    "--tw-placeholder-opacity",
    { selectorRewrite: (value) => `${value}::placeholder` },
  ),
  caretColor: themeRule("caret", theme.caretColor, "caret-color", {
    alphaModifiers: theme.opacity,
  }),
  accentColor: themeRule("accent", theme.accentColor, "accent-color", {
    alphaModifiers: theme.opacity,
  }),
  opacity: themeRule("opacity", theme.opacity, "opacity"),
  backgroundBlendMode: enumRule(
    "bg-blend-",
    "background-blend-mode",
    blendModes,
  ),
  mixBlendMode: enumRule(
    "mix-blend-",
    "mix-blend-mode",
    blendModes.concat(["plus-darker", "plus-lighter"]),
  ),
  // Non-compliant: incompatible with ring
  boxShadow: complexThemeRule("shadow", theme.boxShadow, (value) =>
    typeof value === "string"
      ? [["box-shadow", value]]
      : [
          ["--tw-shadow-color", value.defaultColor],
          ["box-shadow", value.value],
        ],
  ),
  boxShadowColor: themeRule(
    "shadow",
    theme.boxShadowColor,
    "--tw-shadow-color",
    { arbitrary: "color-only", alphaModifiers: theme.opacity },
  ),
  outlineStyle: [
    [
      "outline-none",
      [
        ["outline", "2px solid transparent"],
        ["outline-offset", "2px"],
      ],
    ],
    ["outline", [["outline-style", "solid"]]],
    ...enumRule("outline-", "outline-style", ["dashed", "dotted", "double"]),
  ],
  outlineWidth: themeRule("outline", theme.outlineWidth, "outline-width"),
  outlineOffset: themeRule(
    "outline-offset",
    theme.outlineOffset,
    "outline-offset",
    { supportsNegativeValues: true },
  ),
  outlineColor: themeRule("outline", theme.outlineColor, "outline-color", {
    arbitrary: "color-only",
    alphaModifiers: theme.opacity,
  }),
  ringWidth: [
    themeRule(
      "ring",
      theme.ringWidth,
      (value) => [
        [
          "--tw-ring-offset-shadow",
          "var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)",
        ],
        [
          "--tw-ring-shadow",
          `var(--tw-ring-inset) 0 0 0 calc(${value} + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
        ],
        ["box-shadow", "var(--tw-ring-offset-shadow), var(--tw-ring-shadow)"],
      ],
      { addDefault: "ring-width" },
    ),
    ["ring-inset", [["--tw-ring-inset", "inset"]]],
  ],
  ringColor: themeRule(
    "ring",
    theme.ringColor,
    (value) =>
      withAlphaVariable({
        properties: ["--tw-ring-color"],
        color: value,
        variable: "--tw-ring-opacity",
        enabled: coreRules.ringOpacity !== false,
      }),
    {
      filterDefault: true,
      arbitrary: "color-only",
      alphaModifiers:
        coreRules.ringOpacity === false ? undefined : theme.ringOpacity,
    },
  ),
  ringOpacity: themeRule(
    "ring-opacity",
    theme.ringOpacity,
    "--tw-ring-opacity",
    { filterDefault: true },
  ),
  ringOffsetWidth: themeRule(
    "ring-offset",
    theme.ringOffsetWidth,
    "--tw-ring-offset-width",
  ),
  ringOffsetColor: themeRule(
    "ring-offset",
    theme.ringOffsetColor,
    "--tw-ring-offset-color",
    { arbitrary: "color-only", alphaModifiers: theme.opacity },
  ),
  blur: filterRule("blur", theme.blur),
  brightness: filterRule("brightness", theme.brightness),
  contrast: filterRule("contrast", theme.contrast),
  dropShadow: complexThemeRule(
    "drop-shadow",
    theme.dropShadow,
    (value) => [
      [
        "--tw-drop-shadow",
        Array.isArray(value)
          ? value.map((v) => `drop-shadow(${v})`).join(" ")
          : `drop-shadow(${value})`,
      ],
      ["filter", cssFilterValue],
    ],
    { addDefault: "filter" },
  ),
  grayscale: filterRule("grayscale", theme.grayscale),
  hueRotate: filterRule("hue-rotate", theme.hueRotate),
  invert: filterRule("invert", theme.invert),
  saturate: filterRule("saturate", theme.saturate),
  sepia: filterRule("sepia", theme.sepia),
  // Non-compliant: Doesn't ship default useless filter
  filter: ["filter-none", [["filter", "none"]]],
  backdropBlur: backdropFilterRule("backdrop-blur", theme.backdropBlur),
  backdropBrightness: backdropFilterRule(
    "backdrop-brightness",
    theme.backdropBrightness,
  ),
  backdropContrast: backdropFilterRule(
    "backdrop-contrast",
    theme.backdropContrast,
  ),
  backdropGrayscale: backdropFilterRule(
    "backdrop-grayscale",
    theme.backdropGrayscale,
  ),
  backdropHueRotate: backdropFilterRule(
    "backdrop-hue-rotate",
    theme.backdropHueRotate,
  ),
  backdropInvert: backdropFilterRule("backdrop-invert", theme.backdropInvert),
  backdropOpacity: backdropFilterRule(
    "backdrop-opacity",
    theme.backdropOpacity,
  ),
  backdropSaturate: backdropFilterRule(
    "backdrop-saturate",
    theme.backdropSaturate,
  ),
  backdropSepia: backdropFilterRule("backdrop-sepia", theme.backdropSepia),
  // Non-compliant: Doesn't ship default useless backdrop-filter
  backdropFilter: [
    "backdrop-filter-none",
    [
      ["-webkit-backdrop-filter", "none"],
      ["backdrop-filter", "none"],
    ],
  ],
  transitionProperty: themeRule(
    "transition",
    theme.transitionProperty,
    (value) => {
      if (value === "none") return [["transition-property", "none"]];
      const entries: CSSEntries = [["transition-property", value]];
      if (theme.transitionTimingFunction["DEFAULT"]) {
        entries.push([
          "transition-timing-function",
          theme.transitionTimingFunction["DEFAULT"],
        ]);
      }
      if (theme.transitionDuration["DEFAULT"]) {
        entries.push([
          "transition-duration",
          theme.transitionDuration["DEFAULT"],
        ]);
      }
      return entries;
    },
  ),
  transitionDelay: themeRule(
    "delay",
    theme.transitionDelay,
    "transition-delay",
  ),
  transitionDuration: themeRule(
    "duration",
    theme.transitionDuration,
    "transition-duration",
    { filterDefault: true },
  ),
  transitionTimingFunction: themeRule(
    "ease",
    theme.transitionTimingFunction,
    "transition-timing-function",
    { filterDefault: true },
  ),
  willChange: themeRule("will-change", theme.willChange, "will-change"),
  content: themeRule("content", theme.content, "content"),
  forcedColorAdjust: [
    ["forced-color-adjust-auto", [["forced-color-adjust", "auto"]]],
    ["forced-color-adjust-none", [["forced-color-adjust", "none"]]],
  ],
});

const themeRule = (
  prefix: string,
  themeMap: Record<string, string | undefined>,
  properties: string | Properties | ((value: string) => CSSEntries),
  options?: ThemeRuleMeta,
): ThemeRule<string> => [
  prefix,
  themeMap,
  typeof properties === "function"
    ? properties
    : (value) =>
        typeof properties === "string"
          ? [[properties, value]]
          : properties.map((p) => (typeof p === "string" ? [p, value] : p)),
  options,
];

const complexThemeRule = <T>(
  prefix: string,
  themeMap: Record<string, T | undefined>,
  properties: (value: T) => CSSEntries,
  options?: ThemeRuleMeta,
): ThemeRule<T> => [prefix, themeMap, properties, options];

type Properties = (string | CSSEntry)[];
const directionThemeRule = <
  Direction extends string,
  Mandatory extends boolean,
>(
  prefix: string,
  directions: Direction[] | readonly Direction[],
  themeMap: Record<string, string | undefined>,
  properties: (
    direction: Mandatory extends true ? Direction : Direction | "all",
    value: string,
  ) => CSSEntries | Properties,
  options?: ThemeRuleMeta & { omitHyphen?: boolean; mandatory?: Mandatory },
): DirectionThemeRule => [
  prefix,
  directions as string[],
  themeMap,
  (d, v) =>
    properties(d as any, v).map((p) => (typeof p === "string" ? [p, v] : p)),
  options,
];

const enumRule = (
  prefix: string,
  property: string,
  values: string[],
  transformValue: (value: string) => string = (v) => v,
  selectorRewrite: SelectorRewrite | undefined = undefined,
): StaticRule[] =>
  values.map((v) => [
    `${prefix}${v}`,
    [[property, transformValue(v)]],
    { selectorRewrite },
  ]);

const touchActionRule = (name: string, variable: string): BaseRule => [
  `touch-${name}`,
  [
    [variable, name],
    ["touch-action", cssTouchActionValue],
  ],
  { addDefault: "touch-action" },
];

const filterRule = (
  name: string,
  themeMap: Record<string, string | undefined>,
): ThemeRule<string> => [
  name,
  themeMap,
  (value) => [
    [`--tw-${name}`, value ? `${name}(${value})` : ""],
    ["filter", cssFilterValue],
  ],
  { addDefault: "filter" },
];

const backdropFilterRule = (
  name: `backdrop-${string}`,
  themeMap: Record<string, string | undefined>,
): ThemeRule<string> => [
  name,
  themeMap,
  (value) => [
    [`--tw-${name}`, value ? `${name.slice(9)}(${value})` : ""],
    ["-webkit-backdrop-filter", cssBackdropFilterValue],
    ["backdrop-filter", cssBackdropFilterValue],
  ],
  { addDefault: "backdrop-filter" },
];

const siblingChildrenSelectorRewrite: SelectorRewrite = (v) => `${v} > * + *`;

const prefixFlex = (v: string) =>
  ["start", "end"].includes(v) ? `flex-${v}` : v;
const prefixSpace = (v: string) =>
  ["between", "around", "evenly"].includes(v) ? `space-${v}` : v;

const overflows = ["auto", "hidden", "clip", "visible", "scroll"];
const overscrolls = ["none", "contain", "auto"];
const breaks = [
  "auto",
  "avoid",
  "all",
  "avoid-page",
  "page",
  "left",
  "right",
  "column",
];
const blendModes = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

const suffixDirection = (
  prefix: string,
  d: keyof typeof directionSuffixMap,
): Properties => directionSuffixMap[d].map((suffix) => `${prefix}${suffix}`);

const standardDirections = ["x", "y", "t", "l", "b", "r"] as const;

const directionSuffixMap = {
  all: [""],
  x: ["-left", "-right"],
  y: ["-top", "-bottom"],
  t: ["-top"],
  r: ["-right"],
  b: ["-bottom"],
  l: ["-left"],
};

const borderRadiusDirectionMap = {
  all: ["border-radius"],
  t: ["border-top-left-radius", "border-top-right-radius"],
  r: ["border-top-right-radius", "border-bottom-right-radius"],
  b: ["border-bottom-right-radius", "border-bottom-left-radius"],
  l: ["border-top-left-radius", "border-bottom-left-radius"],
  tr: ["border-top-right-radius"],
  br: ["border-bottom-right-radius"],
  bl: ["border-bottom-left-radius"],
  tl: ["border-top-left-radius"],
};

const borderWidthDirectionMap = {
  all: ["border-width"],
  x: ["border-left-width", "border-right-width"],
  y: ["border-top-width", "border-bottom-width"],
  t: ["border-top-width"],
  r: ["border-right-width"],
  b: ["border-bottom-width"],
  l: ["border-left-width"],
};

const cssTransformValue = [
  "translate(var(--tw-translate-x), var(--tw-translate-y))",
  "rotate(var(--tw-rotate))",
  "skewX(var(--tw-skew-x))",
  "skewY(var(--tw-skew-y))",
  "scaleX(var(--tw-scale-x))",
  "scaleY(var(--tw-scale-y))",
].join(" ");
const cssTouchActionValue =
  "var(--tw-pan-x) var(--tw-pan-y) var(--tw-pinch-zoom)";
const cssFilterValue = [
  "var(--tw-blur)",
  "var(--tw-brightness)",
  "var(--tw-contrast)",
  "var(--tw-grayscale)",
  "var(--tw-hue-rotate)",
  "var(--tw-invert)",
  "var(--tw-saturate)",
  "var(--tw-sepia)",
  "var(--tw-drop-shadow)",
].join(" ");
const cssBackdropFilterValue = [
  "var(--tw-backdrop-blur)",
  "var(--tw-backdrop-brightness)",
  "var(--tw-backdrop-contrast)",
  "var(--tw-backdrop-grayscale)",
  "var(--tw-backdrop-hue-rotate)",
  "var(--tw-backdrop-invert)",
  "var(--tw-backdrop-opacity)",
  "var(--tw-backdrop-saturate)",
  "var(--tw-backdrop-sepia)",
].join(" ");

const transparentTo = (value: string) =>
  withAlphaValue(value, "0", "rgb(255 255 255 / 0)");
