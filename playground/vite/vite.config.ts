import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { downwind } from "../../dist/vite.js";

export default defineConfig({
  plugins: [react(), downwind()],
  css: {
    transformer: "lightningcss",
  },
  build: {
    cssMinify: "lightningcss",
  },
});
