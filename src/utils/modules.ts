import { cssModuleToJS as cssModuleToJSDeclaration } from "../types";

export const cssModuleToJS: typeof cssModuleToJSDeclaration = (cssModule) =>
  Object.entries(cssModule)
    .map(([key, value]) => `export const ${key} = "${value.name}";\n`)
    .concat(`export default { ${Object.keys(cssModule).join(", ")} };\n`)
    .join("");
