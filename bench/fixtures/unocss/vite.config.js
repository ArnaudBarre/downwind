import Unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [Unocss({ mergeSelectors: false, include: [/\.js$/] })],
});
