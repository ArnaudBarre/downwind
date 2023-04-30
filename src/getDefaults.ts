import { ResolvedConfig } from "./resolveConfig";
import { Default, CSSEntries } from "./types";
import { withAlphaValue } from "./utils/colors";

export type Defaults = Record<Default, CSSEntries>;

export const getDefaults = ({ theme }: ResolvedConfig): Defaults => {
  const ringOpacityDefault = theme.ringOpacity.DEFAULT ?? "0.5";
  const ringColorDefault = withAlphaValue(
    theme.ringColor.DEFAULT ?? "",
    ringOpacityDefault,
    `rgb(147 197 253 / ${ringOpacityDefault})`,
  );

  return {
    "transform": [
      ["--tw-translate-x", "0"],
      ["--tw-translate-y", "0"],
      ["--tw-rotate", "0"],
      ["--tw-skew-x", "0"],
      ["--tw-skew-y", "0"],
      ["--tw-scale-x", "1"],
      ["--tw-scale-y", "1"],
    ],
    "gradient-color-stops": [
      ["--tw-gradient-from", " "],
      ["--tw-gradient-stops", " "],
      ["--tw-gradient-to", " "],
    ],
    "touch-action": [
      ["--tw-pan-x", " "],
      ["--tw-pan-y", " "],
      ["--tw-pinch-zoom", " "],
    ],
    "scroll-snap-type": [["--tw-scroll-snap-strictness", "proximity"]],
    "font-variant-numeric": [
      ["--tw-ordinal", " "],
      ["--tw-slashed-zero", " "],
      ["--tw-numeric-figure", " "],
      ["--tw-numeric-spacing", " "],
      ["--tw-numeric-fraction", " "],
    ],
    "ring-width": [
      ["--tw-ring-inset", " "],
      ["--tw-ring-offset-width", theme.ringOffsetWidth.DEFAULT ?? "0px"],
      ["--tw-ring-offset-color", theme.ringOffsetColor.DEFAULT ?? "#fff"],
      ["--tw-ring-color", ringColorDefault],
      ["--tw-ring-offset-shadow", "0 0 #0000"],
      ["--tw-ring-shadow", "0 0 #0000"],
    ],
    "filter": [
      ["--tw-blur", " "],
      ["--tw-brightness", " "],
      ["--tw-contrast", " "],
      ["--tw-grayscale", " "],
      ["--tw-hue-rotate", " "],
      ["--tw-invert", " "],
      ["--tw-saturate", " "],
      ["--tw-sepia", " "],
      ["--tw-drop-shadow", " "],
    ],
    "backdrop-filter": [
      ["--tw-backdrop-blur", " "],
      ["--tw-backdrop-brightness", " "],
      ["--tw-backdrop-contrast", " "],
      ["--tw-backdrop-grayscale", " "],
      ["--tw-backdrop-hue-rotate", " "],
      ["--tw-backdrop-invert", " "],
      ["--tw-backdrop-opacity", " "],
      ["--tw-backdrop-saturate", " "],
      ["--tw-backdrop-sepia", " "],
    ],
  };
};
