export const escapeSelector = (selector: string) => {
  const escaped = selector.replaceAll(
    // Keep in sync allowed chars below
    /[.:/[\]!#='",%&>+~*@()]/g,
    (c) => `\\${c}`,
  );
  return /^\d/.test(escaped) ? `\\${escaped}` : escaped;
};

const regularVariant = /[a-z0-9][a-z0-9-]+/;
const childVariant = /\*/;
// []="'_ for attributes: aria-[labelledby='a_b'] has-[[data-active]]
// :>+*~. for css selectors: has-[>_h1_+_h2]
const dynamicVariant = /[a-z-]+-\[[a-z0-9[\]="'_:>+*~.-]+]/;
// & to position the selector
// []="' for attributes: [&[type="email"]]
// :>+*~.()_ for css selectors: [&:nth-child(3)] [&_p] [&>*] [.sidebar+&]
// @ for media: [@media(min-width:900px)]
const arbitraryVariant = /\[[a-z0-9&[\]="':>+*~.()_@-]+]/;
const variant = new RegExp(
  `(?:${regularVariant.source}|${childVariant.source}|${dynamicVariant.source}|${arbitraryVariant.source}):`,
);
const variants = new RegExp(`(?:${variant.source})*`);

// Opacity/line-height modifiers
const regularModifier = /[a-z0-9]+/;
// .% for opacity
// ()+*/- for calc (line height)
const arbitraryModifier = /\[[a-z0-9.%()+*/-]+]/;
const modifier = new RegExp(
  `/(?:${regularModifier.source}|${arbitraryModifier.source})`,
);

// % linear-background: via-40%
// Requires at least 3 chars, only a constraint for custom utils
const regularUtilities = /[a-z][a-z0-9-.]*[a-z0-9%]/;
// # for color
// . for opacity
// _, for linear-background
// ' for content (before/after)
// % for size
// ()+*/- for calc
const arbitraryValueSet = /[a-z0-9#._,'%()+*/-]+/;
const arbitraryValues = new RegExp(
  `[a-z][a-z-]*-\\[${arbitraryValueSet.source}]`,
);

const ruleBasedContent = new RegExp(
  `-?(?:${regularUtilities.source}|${arbitraryValues.source})(?:${modifier.source})?`,
);

const arbitraryProperties = new RegExp(
  `\\[[a-z][a-z-]+:${arbitraryValueSet.source}]`,
);
const selectorREWithoutBorders = new RegExp(
  `${variants.source}!?(?:${ruleBasedContent.source}|${arbitraryProperties.source})`,
);

// } for template string: `${base}text-lg` (questionnable)
const leftBorder = /(?<=['"`\s}])/;
// : for object keys
// $ for template string: `text-lg${base}` (questionnable)
const rightBorder = /(?=['"`\s:$])/;

export const selectorRE = new RegExp(
  `${leftBorder.source}${selectorREWithoutBorders.source}${rightBorder.source}`,
  "g",
);
