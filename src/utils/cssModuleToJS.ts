import type { cssModuleToJS as cssModuleToJSDeclaration } from "../types";

export const cssModuleToJS: typeof cssModuleToJSDeclaration = (cssModule) => {
  let namedExport = "";
  let defaultExport = "export default {\n";
  for (const key in cssModule) {
    if (!key.includes("-")) {
      namedExport += `export const ${key} = "${cssModule[key].name}";\n`;
      defaultExport += `  ${key},\n`;
    } else {
      defaultExport += `  "${key}": "${cssModule[key].name}",\n`;
    }
  }
  defaultExport += "};";
  return namedExport + defaultExport;
};
