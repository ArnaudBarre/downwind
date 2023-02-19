module.exports = {
  root: true,
  extends: ["@arnaud-barre"],
  parserOptions: {
    project: ["**/tsconfig.json"],
  },
  rules: {
    "require-unicode-regexp": "off",
    "no-param-reassign": "off",
  },
};
