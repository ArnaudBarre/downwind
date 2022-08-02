import { defineConfig } from "vite";

import { vitePlugin as downwind } from "../../../dist";

export default defineConfig({ plugins: [downwind()] });
