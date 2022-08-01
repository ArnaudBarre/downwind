import { defineConfig } from "vite";
import reactRefresh from "vite-plugin-swc-react-refresh";

import { vitePlugin as downwind } from "../../dist";

// eslint-disable-next-line import/no-default-export
export default defineConfig({ plugins: [reactRefresh(), downwind()] });
