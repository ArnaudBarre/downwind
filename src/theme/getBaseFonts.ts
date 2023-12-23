export const getBaseFonts = () => ({
  sans: [
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"',
  ].join(", "),
  serif: [
    "ui-serif",
    "Georgia",
    "Cambria",
    '"Times New Roman"',
    "Times",
    "serif",
  ].join(", "),
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    '"Liberation Mono"',
    '"Courier New"',
    "monospace",
  ].join(", "),
});
