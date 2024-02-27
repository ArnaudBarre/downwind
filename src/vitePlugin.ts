import type { IncomingMessage } from "node:http";
import type { Logger, Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { initDownwind } from "./index.ts";
import type { Downwind } from "./types.d.ts";
import { intervalCheck } from "./utils/intervalCheck.ts";
import type { downwind as declaration } from "./vite.d.ts";

const cssRE = /\.css(\?.+)?$/;

export { vitePlugin as downwind };

const vitePlugin: typeof declaration = ({
  shouldScan = (id: string, code: string) =>
    id.endsWith(".tsx") ||
    (id.endsWith(".ts") && code.includes("@downwind-scan")),
  buildIntervalCheckMs = 200,
} = {}): Plugin[] => {
  let downwind: Downwind;
  let devtoolsPostPath: string;

  // Common
  const configResolved = async (config: ResolvedConfig) => {
    const origin = config.server.origin ?? "";
    devtoolsPostPath = `${origin}/@downwind-devtools-update`;
    downwind = await initDownwind();
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
  let utilsIntervalCheck: ReturnType<typeof intervalCheck<string>>;

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
              const hasNew = downwind.scan(` ${classes.join(" ")} `);
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
          const result = downwind.preTransformCSS(code);
          if (result.invalidateUtils && lastServed) sendUpdate();
          return { code: result.code };
        }
        if (!id.includes("/node_modules/") && shouldScan(id, code)) {
          const hasNew = downwind.scan(code);
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
      configResolved,
      resolveId,
      buildStart() {
        hasBase = false;
        hasUtils = false;
        utilsIntervalCheck = intervalCheck(buildIntervalCheckMs, () =>
          downwind.generate(),
        );
      },
      load(id) {
        if (id === baseModuleId) return downwind.getBase();
        if (id === utilsModuleId) return utilsIntervalCheck.promise;
        if (id === devtoolsModuleId) return "";
      },
      transform(code, id) {
        if (id === baseModuleId) return;
        if (id === utilsModuleId) return;
        if (id === devtoolsModuleId) return;
        if (cssRE.test(id)) {
          utilsIntervalCheck.taskRunning();
          return {
            code: downwind.preTransformCSS(code).code,
            map: { mappings: "" },
          };
        }
        if (!id.includes("/node_modules/") && shouldScan(id, code)) {
          utilsIntervalCheck.taskRunning();
          downwind.scan(code);
        }
      },
    },
    {
      name: "downwind:build:post",
      apply: "build",
      enforce: "post",
      generateBundle() {
        if (!hasBase || !hasUtils) {
          this.error(
            `Import virtual:@downwind/${
              hasUtils ? "base.css" : "utils.css"
            } was not found in the bundle. Downwind can't work without both virtual:@downwind/base.css and virtual:@downwind/utils.css.`,
          );
        }
        utilsIntervalCheck.clean();
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
