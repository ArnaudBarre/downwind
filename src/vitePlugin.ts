import type { IncomingMessage } from "node:http";
import type { Logger, Plugin, Rollup, ViteDevServer } from "vite";
import { getRollupUtils } from "./rollupUtils.ts";
import type { downwind as declaration } from "./vite.d.ts";

export { vitePlugin as downwind };

const vitePlugin: typeof declaration = ({
  shouldScan = (id: string, code: string) =>
    id.endsWith(".tsx")
    || (id.endsWith(".ts") && code.includes("@downwind-scan")),
} = {}): Plugin[] => {
  let devtoolsPostPath: string;

  const {
    downwind,
    baseModuleId,
    utilsModuleId,
    devtoolsModuleId,
    resolveId,
    buildLoad,
    buildTransform,
    buildStart,
    getEntryPointsError,
  } = getRollupUtils(shouldScan);

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
  let cssPostPlugin: Plugin;

  return [
    {
      name: "downwind:dev",
      apply: "serve",
      enforce: "pre",
      buildStart,
      configResolved(config) {
        const origin = config.server.origin ?? "";
        devtoolsPostPath = `${origin}/@downwind-devtools-update`;
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
              const hasNew = downwind().scan(` ${classes.join(" ")} `);
              if (hasNew) sendUpdate();
              res.writeHead(200);
              res.end();
            })
            .catch((err: Error) => {
              logger.error(err.message);
              res.writeHead(500);
              res.end(err.message);
            });
        });
      },
      transformIndexHtml() {
        if (!hasWarn) {
          hasWarn = true;
          setTimeout(() => {
            const error = getEntryPointsError();
            if (error) {
              logger.warn(error);
              server.ws.send({
                type: "error",
                err: { message: error, stack: "" },
              });
            }
          }, 20_000);
        }
      },
      resolveId,
      load: {
        filter: { id: /^virtual:@downwind\// },
        handler: async (id) => {
          if (id === baseModuleId) return downwind().getBase();
          if (id === utilsModuleId) {
            await server.waitForRequestsIdle(id);
            lastServed = Date.now();
            return downwind().generate();
          }
          if (id === devtoolsModuleId) {
            return devtoolsClient
              .replace("__POST_PATH__", devtoolsPostPath)
              .replace("__CSS__", downwind().codegen({ mode: "DEVTOOLS" }));
          }
        },
      },
      transform: {
        filter: { id: { exclude: /\/node_modules\// } },
        handler: (code, id) => {
          if (id.endsWith(".css")) {
            const result = downwind().preTransformCSS(code);
            if (result.invalidateUtils && lastServed) sendUpdate();
            return { code: result.code };
          }
          if (shouldScan(id, code)) {
            const hasNew = downwind().scan(code);
            if (hasNew && lastServed) sendUpdate();
          }
        },
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
      buildStart,
      configResolved(config) {
        cssPostPlugin = config.plugins.find((i) => i.name === "vite:css-post")!;
      },
      resolveId,
      load: buildLoad,
      transform: buildTransform,
      async renderChunk(_, chunk) {
        if (utilsModuleId in chunk.modules) {
          const handler =
            "handler" in cssPostPlugin.transform!
              ? cssPostPlugin.transform.handler
              : cssPostPlugin.transform!;
          // Fool the vite:css-post plugin to replace the CSS content
          // https://github.com/unocss/unocss/blob/f341004e95e283a4e6f3177f338a44edba497e21/packages-integrations/vite/src/modes/global/build.ts#L215-L216
          await handler.call(
            this as Rollup.TransformPluginContext,
            downwind().generate(),
            utilsModuleId,
          );
        }
        return null;
      },
    },
    {
      name: "downwind:build:post",
      apply: "build",
      enforce: "post",
      generateBundle() {
        const error = getEntryPointsError();
        if (error) this.error(error);
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
        reject(e as Error);
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
