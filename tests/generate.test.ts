import * as assert from "node:assert";
import { writeFileSync, readFileSync } from "node:fs";
import test from "node:test";

import { initDownwind } from "../src";
import { UserConfig } from "../src/types";
import { shouldUpdateSnapshots } from "./test-utils";

const cases: [name: string, content: string, config?: UserConfig][] = [
  ["simple", "m-4 p-4 "],
  ["order-invariant", "p-4 m-4"],
  ["colors", "text-slate-200 bg-orange-300"],
  ["screen", "md:p-4 p-2 md:p-6"],
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
  ["variants", "hover:p-4 md:print:landscape:first:p-8"],
  ["disable-plugin", "p-4 m-4", { corePlugins: { padding: false } }],
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
      plugins: [
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
      plugins: (theme) => [
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
          { components: true, selectorRewrite: (v) => `${v} > *` },
        ],
      ],
    },
  ],
];

const snapshots = Object.fromEntries(
  readFileSync("./tests/snapshots/generate.css", "utf-8")
    .split("/* ")
    .slice(1)
    .map((v) => [v.slice(0, v.indexOf(":")), `/* ${v}`]),
);

(async () => {
  let newSnapshot = "";
  for (const [name, content, config = {}] of cases) {
    globalThis.TEST_CONFIG = config;
    const downwind = await initDownwind();
    downwind.scan(`${name}.tsx`, content);
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
})();
