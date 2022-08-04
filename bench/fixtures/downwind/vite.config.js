import { defineConfig } from "vite";

import { downwind } from "../../../dist/vite";

export default defineConfig({ plugins: [downwind()] });
