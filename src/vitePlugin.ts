import { IncomingMessage } from "node:http";
import { getHash } from "@arnaud-barre/config-loader";
import { transform as lightningCSSTransform, Targets } from "lightningcss";
import { Logger, Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { convertTargets, initDownwind } from "./index.ts";
import type { Downwind } from "./types.d.ts";
import type { downwind as declaration } from "./vitePlugin.d";

const cssRE = /\.css(\?.+)?$/;

export { vitePlugin as downwind };

const vitePlugin: typeof declaration = ({
  scannedExtension,
} = {}): Plugin[] => {
  let downwind: Downwind;
  let targets: Targets | undefined;
  let devtoolsPostPath: string;

  // Common
  const configResolved = async (config: ResolvedConfig) => {
    targets = convertTargets(config.build.cssTarget);
    const origin = config.server.origin ?? "";
    devtoolsPostPath = `${origin}/@downwind-devtools-update`;
    downwind = await initDownwind({
      targets,
      scannedExtension,
      root: config.root,
    });
  };

  let hasBase = false;
  let hasUtils = false;
  const notFoundErrorMessage =
    '[downwind] entry points not found, did you add `import "virtual:@downwind/base.css"` and `import "virtual:@downwind/utils.css"` in your main entry?';
  const baseVirtual = "virtual:@downwind/base.css";
  const baseModuleId = `/${baseVirtual}`;
  const utilsVirtual = "virtual:@downwind/utils.css";
  const utilsModuleId = `/${utilsVirtual}`;
  const devtoolsVirtual = "virtual:@downwind/devtools";
  const devtoolsModuleId = `/${devtoolsVirtual}`;
  const resolveId = (id: string) => {
    if (id === baseVirtual) {
      hasBase = true;
      return baseModuleId;
    }
    if (id === utilsVirtual) {
      hasUtils = true;
      return utilsModuleId;
    }
    if (id === devtoolsVirtual) return devtoolsModuleId;
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
        server.middlewares.use((req, res, next) => {
          if (req.url !== devtoolsPostPath) {
            next();
            return;
          }
          getBodyJson<string[]>(res.req)
            .then((classes) => {
              const hasNew = downwind.scan(
                "devtools-update",
                `@downwind-scan ${classes.join(" ")}`,
              );
              if (hasNew) sendUpdate();
              res.writeHead(200);
              res.end();
            })
            .catch((err) => {
              logger.error(err);
              res.writeHead(500);
              res.end(err.message);
            });
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
        if (id === devtoolsModuleId) {
          return devtoolsClient
            .replace("__POST_PATH__", devtoolsPostPath)
            .replace("__CSS__", downwind.codegen({ mode: "DEVTOOLS" }));
        }
      },
      transform(code, id) {
        if (id.endsWith(".css")) {
          const result = downwind.preTransform(code);
          if (result.invalidateUtils && lastServed) sendUpdate();
          return { code: result.content };
        }
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
        if (id === devtoolsModuleId) return "";
      },
      transform(code, id) {
        if (cssRE.test(id)) {
          return { code: downwind.preTransform(code).content, map: null };
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
            downwind.generate({ skipLightningCSS: true }),
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
              .replace(
                placeholder,
                downwind.generate({ skipLightningCSS: true }),
              );
            chunk.source = lightningCSSTransform({
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

const getBodyJson = <T>(req: IncomingMessage) =>
  new Promise<T>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("error", reject);
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });

/**
 * From https://github.com/ArnaudBarre/rds/blob/main/src/client/css-devtools.ts
 * Adapted from https://github.com/unocss/unocss/blob/main/packages/vite/src/client.ts
 */
const devtoolsClient = `
const sentClasses = new Set();
const pendingClasses = new Set();
let timeoutId;

new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    Array.from(mutation.target.classList).forEach((i) => {
      if (!sentClasses.has(i)) pendingClasses.add(i);
    });
  });
  if (pendingClasses.size) {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    const payload = Array.from(pendingClasses);
    timeoutId = setTimeout(() => {
      fetch("__POST_PATH__", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((res) => {
        if (res.ok) {
          for (const el of payload) {
            sentClasses.add(el);
            pendingClasses.delete(el);
          }
        }
      });
    }, 10);
  }
}).observe(document.documentElement, {
  subtree: true,
  attributeFilter: ["class"],
});

const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.setAttribute("data-vite-dev-id", "@downwind/devtools");
style.innerHTML = "__CSS__";
document.head.appendChild(style);
`;
