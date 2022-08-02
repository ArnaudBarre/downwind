#!/usr/bin/env tnode
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const map = (a: string[], b: string[], separator = "-") => {
  const classes = [];
  for (const n of a) {
    for (const t of b) classes.push(n + separator + t);
  }
  return classes;
};

const sizes = ["sm", "lg", "xl"];
const colors = map(["red", "orange", "blue"], ["200", "400"]);
const variants = [
  "hover",
  "first",
  "active",
  "dark",
  "dark:hover:focus:first:active",
  ...sizes,
  ...map(sizes, ["dark:hover:focus:first:active"], ":"),
];

const names = [
  ...map(
    ["p", "pt", "m", "mx", "top"],
    [
      ...Array.from({ length: 10 }, (_, i) => i.toString()),
      "[1px]",
      "[3vh]",
      "[3.555em]",
    ],
  ),
  ...map(
    ["text", "bg", "border"],
    [
      ...colors,
      ...map(colors, ["10", "20"], "/"),
      "[#525343]",
      "[#124453]",
      "[#942]",
    ],
  ),
  ...map(["text", "rounded"], [...sizes]),
  ...map(["grid-cols"], ["1", "2", "[1fr,3em]", "[20px,min-content,1fr]"]),
];

export const classes = [...names, ...map(variants, names, ":")];

export const shuffle = (array: string[]) => {
  array = Array.from(array);
  let curr = array.length;
  let idx;

  // While there remain elements to shuffle...
  while (curr !== 0) {
    // Pick a remaining element...
    idx = Math.floor(Math.random() * curr);
    curr--;

    // And swap it with the current element.
    [array[curr], array[idx]] = [array[idx], array[curr]];
  }

  return array;
};

const getContent = () =>
  `// @css-scan
document.getElementById('app').className = "${shuffle(classes).join(" ")}"`;

const sourceDir = join(__dirname, "source");
if (!existsSync(sourceDir)) mkdirSync(sourceDir);
writeFileSync(
  join(sourceDir, "gen.js"),
  'import "./gen1";import "./gen2";import "./gen3";',
);
writeFileSync(join(sourceDir, "gen1.js"), getContent());
writeFileSync(join(sourceDir, "gen2.js"), getContent());
writeFileSync(join(sourceDir, "gen3.js"), getContent());
