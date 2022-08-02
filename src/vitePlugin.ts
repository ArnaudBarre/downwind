import { createHash } from "crypto";
import { transform as parcelTransform } from "@parcel/css";
import { ViteDevServer, Plugin } from "vite";

import { initDownwind } from "./index";
import { vitePlugin as vitePluginDeclaration } from "./types";

const scanRE = /\.[jt]sx?$/;
const cssRE = /\.css(\?.+)?$/;

export const vitePlugin: typeof vitePluginDeclaration = async (
  targets,
): Promise<Plugin[]> => {
  const downwind = await initDownwind(targets);

  // Common
  let hasBase = false;
  let hasUtils = false;
  const baseVirtual = "virtual:@downwind/base.css";
  const baseModuleId = `/${baseVirtual}`;
  const utilsVirtual = "virtual:@downwind/utils.css";
  const utilsModuleId = `/${utilsVirtual}`;
  const resolveId = (id: string) => {
    if (id === baseVirtual) {
      hasBase = true;
      return baseModuleId;
    }
    if (id === utilsVirtual) {
      hasUtils = true;
      return utilsModuleId;
    }
  };

  // Dev
  let server: ViteDevServer;
  const hmrEvent = "downwind:hmr";
  let lastUpdate = Date.now();
  let lastServed = 0;
  const sendUpdate = () => {
    server.moduleGraph.invalidateModule(
      server.moduleGraph.getModuleById(`/${utilsVirtual}`)!,
    );
    lastUpdate = Date.now();
    server.ws.send({
      type: "update",
      updates: [
        {
          type: "js-update",
          path: `/${utilsVirtual}`,
          acceptedPath: `/${utilsVirtual}`,
          timestamp: Date.now(),
        },
      ],
    });
  };

  // Build
  let minify = false;
  let cssPostPlugin: any;
  const placeholder = "#--downwind-{layer:utils}";
  let hashPlaceholder: string | undefined;

  return [
    {
      name: "downwind:dev",
      apply: "serve",
      enforce: "pre",
      configureServer(_server) {
        server = _server;
        server.ws.on(hmrEvent, (servedTime: number) => {
          if (servedTime < lastUpdate) sendUpdate();
        });
      },
      resolveId,
      load(id) {
        if (id === baseModuleId) return downwind.getBase();
        if (id === utilsModuleId) {
          lastServed = Date.now();
          return downwind.generate();
        }
      },
      async transform(code, id) {
        if (id.endsWith(".css")) return { code: downwind.preTransform(code) };
        if (!id.includes("/node_modules/") && scanRE.test(id)) {
          await new Promise((res) => setTimeout(res, 1_000));
          const hasNew = downwind.scan(id, code);
          if (hasNew) sendUpdate();
        }
      },
    },
    {
      name: "downwind:dev:post",
      apply: "serve",
      enforce: "post",
      transform(code, id) {
        if (id === utilsModuleId) {
          const snippet = `\nif (import.meta.hot) { try { import.meta.hot.send('${hmrEvent}', ${lastServed}) } catch (e) { console.warn('[downwind-hmr]', e) } }`;
          return code + snippet;
        }
      },
    },
    {
      name: "downwind:build",
      apply: "build",
      enforce: "pre",
      configResolved(config) {
        minify = config.build.minify !== false;
        cssPostPlugin = config.plugins.find((i) => i.name === "vite:css-post");
      },
      resolveId,
      load(id) {
        if (id === baseModuleId) return downwind.getBase();
        if (id === utilsModuleId) return placeholder;
      },
      transform(code, id) {
        if (cssRE.test(id)) return { code: downwind.preTransform(code) };
        if (!id.includes("/node_modules/") && scanRE.test(id)) {
          downwind.scan(id, code);
        }
      },
      // we inject a hash to chunk before the dist hash calculation to make sure
      // the hash is different when utils changes
      // taken from https://github.com/unocss/unocss/blob/main/packages/vite/src/modes/global/build.ts#L111
      async renderChunk(_, chunk) {
        const hasUtilsModule = !!chunk.modules[utilsModuleId] as boolean;
        if (hasUtilsModule) {
          const fakeId = "downwind-hash.css";
          chunk.modules[fakeId] = {
            code: null,
            originalLength: 0,
            removedExports: [],
            renderedExports: [],
            renderedLength: 0,
          };
          hashPlaceholder = `#--downwind-hash--{content:${getHash(
            downwind.generate(),
          )}}`;
          // fool the css plugin to generate the css in corresponding chunk
          await cssPostPlugin.transform.call({}, hashPlaceholder, fakeId);
        }
        return null;
      },
      generateBundle(_, bundle) {
        if (!hasBase || !hasUtils) {
          this.error(
            `Import virtual:@downwind/${
              hasUtils ? "base.css" : "utils.css"
            } was not found in the bundle. Downwind can't work without both virtual:@downwind/base.css and virtual:@downwind/utils.css.`,
          );
        }

        for (const [path, chunk] of Object.entries(bundle)) {
          if (
            path.endsWith(".css") &&
            chunk.type === "asset" &&
            typeof chunk.source === "string" &&
            chunk.source.includes(placeholder)
          ) {
            const newSource = chunk.source
              .replace(hashPlaceholder!, "")
              .replace(placeholder, downwind.generate());
            chunk.source = minify
              ? parcelTransform({
                  filename: path,
                  code: Buffer.from(newSource),
                  minify: true,
                  targets,
                }).code
              : newSource;
          }
        }
      },
    },
  ];
};

export const getHash = (input: string) =>
  createHash("sha256").update(input).digest("hex").slice(0, 8);
