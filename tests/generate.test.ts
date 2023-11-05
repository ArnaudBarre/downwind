import * as assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import "./set-test-version.ts";
import { initDownwindWithConfig } from "../src/index.ts";
import type { UserConfig } from "../src/types.d.ts";
import { shouldUpdateSnapshots } from "./test-utils.ts";

const cases: [name: string, content: string, config?: UserConfig][] = [
  ["simple", "m-4 p-4"],
  ["order-invariant", "p-4 m-4"],
  ["colors", "text-slate-200 bg-orange-300 border-blue-100"],
  [
    "font-size",
    "text-sm text-xl",
    { theme: { extend: { fontSize: { xl: "30px" } } } },
  ],
  ["hidden", "hidden"],
  ["font-sans", "font-sans"],
  ["transform-gpu", "transform-gpu"],
  ["border-default", "border"],
  ["inset", "inset-0"],
  ["negative values rules", "-m-0 -m-auto -m-4"],
  ["screen", "md:p-4 p-2 md:p-6"],
  ["omit-hyphen rules", "px-2 mt-6 scroll-p-2 scroll-pb-4 scroll-my-6"],
  ["direction mandatory rules", "space-2 space-y-4"],
  ["with-default", "rotate-12"],
  ["with-keyframes", "animate-spin"],
  ["gradients", "from-orange-200 via-purple-400 via-40% to-red-600"],
  ["line-height modifier", "text-lg/8"],
  [
    "box-shadow colors",
    "shadow shadow-lg shadow-none shadow-teal-800 shadow-[#dd2] shadow-[5px_10px_teal]",
  ],
  [
    "transition",
    "transition-opacity",
    { theme: { transitionTimingFunction: {} } },
  ],
  ["container", "container md:p-6"],
  [
    "container-with-screen-max",
    "container tablet:p-4",
    {
      theme: {
        screens: { sm: "640px", tablet: { min: "768px", max: "1440px" } },
      },
    },
  ],
  [
    "container-center-with-fixed-padding",
    "container",
    {
      theme: {
        screens: { md: "768px" },
        container: { center: true, padding: "15px" },
      },
    },
  ],
  [
    "container-with-padding-per-screen",
    "container",
    {
      theme: {
        container: {
          padding: {
            "DEFAULT": "15px",
            "md": "20px",
            "lg": "30px",
            "2xl": "60px",
          },
        },
      },
    },
  ],
  ["variants", "hover:p-4 md:print:landscape:first:p-8"],
  [
    "alpha modifier",
    "bg-orange-400/20 text-slate-200/[.06] border-black/15 bg-[#123456]/15 text-[#222]/[--custom-var]",
    { theme: { extend: { borderOpacity: { "15": "0.15" } } } },
  ],
  [
    "important modifier",
    "!border-0 !rounded-l-none hover:!font-medium first:![color:red]",
  ],
  [
    "arbitrary-values",
    "inset-[-10px] pt-[100px] w-[45%] text-[#ddd] text-[#f009] text-[12px] text-[10px] animate-[highlight_1s_ease-in-out_1] bg-[#ddd]/50 bg-[--primary] bg-red-500/[--opacity] text-[19px]/7 text-[19px]/[27px]",
  ],
  [
    "line height modifier",
    "text-lg/[18px] text-[calc(3rem/5)]/7 text-[calc(3rem/5)]/[calc(4rem/5)]",
  ],
  ["arbitrary-values-with-spaces", "grid grid-cols-[1fr_500px_2fr]"],
  [
    "arbitrary-properties",
    "[mask-type:luminance] hover:[mask-type:alpha] [background:repeating-linear-gradient(45deg,#606dbc,#606dbc_10px,#465298_10px,#465298_20px)]",
  ],
  [
    "arbitrary-variants",
    "[html:has(&)]:bg-blue-500 [&:nth-child(3)]:underline [&>*]:p-4 [.sidebar:hover_&]:opacity-70",
  ],
  ["arbitrary-media", "[@media(min-width:900px)]:block"],
  ["max-screen", "sm:max-md:p-2"],
  ["group-nested-media", "p-1 sm:p-3 sm:print:p-2 m-1 sm:m-3 sm:print:m-2"],
  ["media-order-stable-1", "portrait:p-1 landscape:p-1"],
  ["media-order-stable-2", "landscape:p-1 portrait:p-1"],
  ["supports-*", "supports-[container-type]:grid supports-[display:grid]:grid"],
  ["disable-rule", "p-4 m-4", { coreRules: { padding: false } }],
  [
    "disable-opacity",
    "text-slate-200 bg-orange-300 border-blue-100 border-black/20",
    { coreRules: { textOpacity: false, borderOpacity: false } },
  ],
  ["custom-config", "p-4 p-6 m-4", { theme: { padding: { 4: "4px" } } }],
  [
    "extend-config",
    "p-4 p-6 m-4",
    { theme: { extend: { padding: { 4: "4px" } } } },
  ],
  [
    "static-plugin",
    "flex-center m-4",
    {
      rules: [
        [
          "flex-center",
          [
            ["display", "flex"],
            ["align-items", "center"],
            ["justify-content", "center"],
          ],
        ],
      ],
    },
  ],
  [
    "complex-plugin",
    "m-4 flex-gap-x-4 flex-gap-y-2 flex-gap-6",
    {
      rules: (theme) => [
        // Generates a (hacky margin based) flex-gap plugin for to support Safari iOS < 14.5 (https://caniuse.com/flexbox-gap)
        [
          "flex-gap",
          ["x", "y"],
          theme.spacing,
          (direction, value) => {
            const half = `calc(${value} / 2)`;
            if (direction === "x") {
              return [
                ["margin-left", half],
                ["margin-right", half],
              ];
            }
            if (direction === "y") {
              return [
                ["margin-top", half],
                ["margin-bottom", half],
              ];
            }
            return [["margin", half]];
          },
          { injectFirst: true, selectorRewrite: (v) => `${v} > *` },
        ],
      ],
    },
  ],
  [
    "shortcuts",
    "btn btn-green",
    {
      shortcuts: {
        "btn": "py-2 px-4 font-semibold rounded-lg shadow-md",
        "btn-green": "text-white bg-green-500 hover:bg-green-700",
      },
    },
  ],
  [
    "safelist",
    "m-4",
    { safelist: (theme) => Object.keys(theme.padding).map((v) => `p-${v}`) },
  ],
  ["blocklist", "m-4 invisible", { blocklist: ["invisible"] }],
];

const snapshots = Object.fromEntries(
  readFileSync("./tests/snapshots/generate.css", "utf-8")
    .split("/* ")
    .slice(1)
    .map((v) => [v.slice(0, v.indexOf(":")), `/* ${v}`]),
);

let newSnapshot = "";
for (const [name, content, config] of cases) {
  const downwind = initDownwindWithConfig({ config });
  downwind.scan(content);
  const actual = `/* ${name}: ${content} */\n${downwind.generate()}\n`;
  if (shouldUpdateSnapshots) newSnapshot += actual;
  test(name, () => {
    if (shouldUpdateSnapshots) return;
    assert.equal(actual, snapshots[name]);
  });
}

if (shouldUpdateSnapshots) {
  writeFileSync("./tests/snapshots/generate.css", newSnapshot);
}
