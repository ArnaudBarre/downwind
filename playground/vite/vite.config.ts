import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

import { downwind } from "../../dist/vite";

// eslint-disable-next-line import/no-default-export
export default defineConfig({ plugins: [react(), downwind()] });
