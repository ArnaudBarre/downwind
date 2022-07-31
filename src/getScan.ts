import { readFileSync } from "fs";

import { RuleMatch, TokenParser } from "./getTokenParser";
import { run } from "./utils/helpers";

export const getScan = ({
  tokenParser,
  allMatches,
}: {
  tokenParser: TokenParser;
  allMatches: Map<string, RuleMatch[]>;
}) => {
  const blockList = new Set<string>();
  const contentMap = new Map<string, Set<string>>();
  const allClasses = new Set<string>();

  const validSelectorRE = /^[a-z0-9.:/[\]#-]+$/;
  const scanCode = (code: string) => {
    const matches: RuleMatch[] = [];
    const tokens = code
      .split(/[\s'"`;>=]+/g)
      .filter((t) => validSelectorRE.test(t) && !blockList.has(t));
    const localMatches = new Set<string>();
    for (const token of tokens) {
      if (blockList.has(token) || localMatches.has(token)) continue;
      const match = tokenParser(token); // TODO: Add tokenParser cache
      if (match === undefined) {
        blockList.add(token);
      } else {
        matches.push(match);
        localMatches.add(token);
      }
    }
    return matches;
  };

  return (
    path: string,
    code = readFileSync(path, "utf-8"),
  ): boolean /* hasNew */ => {
    const shouldScan = run(() => {
      if (path.endsWith("x")) return true;
      return code.includes("@css-scan");
    });
    if (!shouldScan) return false;
    const matches = scanCode(code);
    const actual = contentMap.get(path);
    if (
      actual &&
      actual.size >= matches.length &&
      matches.every((m) => actual.has(m.token))
    ) {
      return false;
    }
    contentMap.set(path, new Set(matches.map((m) => m.token)));
    let hasNew = false;
    for (const match of matches) {
      if (allClasses.has(match.token)) continue;
      allClasses.add(match.token);
      allMatches.get(match.screen)!.push(match);
      hasNew = true;
    }
    return hasNew;
  };
};
