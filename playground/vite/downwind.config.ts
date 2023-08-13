import type { DownwindConfig } from "../../src/types.d.ts";

export const config: DownwindConfig = {
  blocklist: ["container"],
  shortcuts: {
    "btn": "py-2 px-4 font-semibold rounded-lg shadow-md",
    "btn-green": "text-white bg-green-500 hover:bg-green-600",
  },
};
