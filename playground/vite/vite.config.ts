import { defineConfig } from "vite";
import { swcReactRefresh } from "vite-plugin-swc-react-refresh";

import { downwind } from "../../dist/vite";

// eslint-disable-next-line import/no-default-export
export default defineConfig({ plugins: [swcReactRefresh(), downwind()] });
