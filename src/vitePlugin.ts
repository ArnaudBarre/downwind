import { createHash } from "crypto";
import { transform as parcelTransform } from "@parcel/css";
import { ViteDevServer, Plugin, ResolvedConfig, Logger } from "vite";

import { initDownwind, convertTargets } from "./index";
import { Downwind, ParcelTargets } from "./types";
import { downwind as declaration } from "./vitePlugin.d";

const cssRE = /\.css(\?.+)?$/;

export { vitePlugin as downwind };

const vitePlugin: typeof declaration = ({
  scannedExtension,
} = {}): Plugin[] => {
  let downwind: Downwind;
  let targets: ParcelTargets | undefined;

  // Common
  const configResolved = async (config: ResolvedConfig) => {
    targets = convertTargets(config.build.cssTarget);
    downwind = await initDownwind({ targets, scannedExtension });
  };

  let hasBase = false;
  let hasUtils = false;
  const notFoundErrorMessage =
    '[downwind] entry points not found, did you add `import "virtual:@downwind/base.css"` and `import "virtual:@downwind/utils.css"` in your main entry?';
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
  let logger: Logger;
  const hmrEvent = "downwind:hmr";
  let hasWarn = false;
  let lastUpdate = Date.now();
  let lastServed = 0;
  const sendUpdate = () => {
    server.moduleGraph.invalidateModule(
      server.moduleGraph.getModuleById(utilsModuleId)!,
    );
    lastUpdate = Date.now();
    server.ws.send({
      type: "update",
      updates: [
        {
          type: "js-update",
          path: utilsModuleId,
          acceptedPath: utilsModuleId,
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
      async configResolved(config) {
        await configResolved(config);
        logger = config.logger;
      },
      configureServer(_server) {
        server = _server;
        server.ws.on(hmrEvent, (servedTime: number) => {
          if (servedTime < lastUpdate) sendUpdate();
        });
      },
      transformIndexHtml() {
        if (!hasWarn) {
          hasWarn = true;
          setTimeout(() => {
            if (!hasBase || !hasUtils) {
              logger.warn(notFoundErrorMessage);
              server.ws.send({
                type: "error",
                err: { message: notFoundErrorMessage, stack: "" },
              });
            }
          }, 20_000);
        }
      },
      resolveId,
      load(id) {
        if (id === baseModuleId) return downwind.getBase();
        if (id === utilsModuleId) {
          lastServed = Date.now();
          return downwind.generate();
        }
      },
      transform(code, id) {
        if (id.endsWith(".css")) return { code: downwind.preTransform(code) };
        if (!id.includes("/node_modules/")) {
          const hasNew = downwind.scan(id, code);
          if (hasNew && lastServed) sendUpdate();
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
      async configResolved(config) {
        await configResolved(config);
        minify = config.build.minify !== false;
        cssPostPlugin = config.plugins.find((i) => i.name === "vite:css-post");
      },
      resolveId,
      load(id) {
        if (id === baseModuleId) return downwind.getBase();
        if (id === utilsModuleId) return placeholder;
      },
      transform(code, id) {
        if (cssRE.test(id)) {
          return { code: downwind.preTransform(code), map: null };
        }
        if (!id.includes("/node_modules/")) downwind.scan(id, code);
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
    },
    {
      name: "downwind:build:post",
      apply: "build",
      enforce: "post",
      generateBundle(_, bundle) {
        if (!hasBase || !hasUtils) {
          this.error(
            `Import virtual:@downwind/${
              hasUtils ? "base.css" : "utils.css"
            } was not found in the bundle. Downwind can't work without both virtual:@downwind/base.css and virtual:@downwind/utils.css.`,
          );
        }

        let placeholderFound = false;
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
            chunk.source = parcelTransform({
              filename: path,
              code: Buffer.from(newSource),
              drafts: { nesting: true },
              minify,
              targets,
            }).code;
            placeholderFound = true;
          }
        }
        if (!placeholderFound) {
          this.error(
            "Couldn't inject CSS utils into the build output. This is an error in the plugin",
          );
        }
      },
    },
  ];
};

const getHash = (input: string) =>
  createHash("sha256").update(input).digest("hex").slice(0, 8);
