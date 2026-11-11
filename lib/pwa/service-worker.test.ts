import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);

function worker(options: { offline?: boolean; storageDenied?: boolean } = {}) {
  const handlers = new Map<string, (event: unknown) => void>();
  const stored = new Map<string, Response>();
  let fetches = 0;
  runInNewContext(source, {
    URL,
    Response,
    self: {
      location: { origin: "https://tracer.test" },
      addEventListener: (name: string, handler: (event: unknown) => void) =>
        handlers.set(name, handler),
    },
    caches: {
      open: async () => {
        if (options.storageDenied) throw new Error("Storage unavailable");
        return {
          match: async (key: string | Request) =>
            stored.get(typeof key === "string" ? key : key.url),
          put: async (request: Request, response: Response) =>
            stored.set(request.url, response),
          keys: async () => [...stored.keys()],
          delete: async (key: string) => stored.delete(key),
        };
      },
    },
    fetch: async () => {
      fetches++;
      if (options.offline) throw new Error("Offline");
      return new Response("online");
    },
  });

  async function request(path: string, overrides = {}) {
    let response: Promise<Response> | undefined;
    const work: Promise<unknown>[] = [];
    handlers.get("fetch")!({
      request: {
        url: new URL(path, "https://tracer.test").href,
        method: "GET",
        mode: "cors",
        destination: "",
        ...overrides,
      },
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
      waitUntil: (value: Promise<unknown>) => work.push(value),
    });
    const result = await response;
    await Promise.all(work);
    return result;
  }
  return { request, stored, fetches: () => fetches };
}

test("worker leaves APIs, auth, documents, RSC and mutations to the network", async () => {
  const sw = worker();
  for (const path of [
    "/api/auth/logout",
    "/api/admin/files/1/content",
    "/admin?_rsc=abc",
    "https://other.test/_next/static/app.js",
  ]) {
    assert.equal(await sw.request(path), undefined);
  }
  assert.equal(await sw.request("/_next/static/app.js"), undefined);
  assert.equal(
    await sw.request("/_next/static/app.js", {
      method: "POST",
      destination: "script",
    }),
    undefined,
  );
  assert.equal(sw.stored.size, 0);
});

test("worker reuses downloaded static assets and bounds storage", async () => {
  const sw = worker();
  await sw.request("/_next/static/app.js", { destination: "script" });
  await sw.request("/_next/static/app.js", { destination: "script" });
  assert.equal(sw.fetches(), 1);
  for (let index = 0; index < 165; index++) {
    await sw.request(`/_next/static/${index}.js`, { destination: "script" });
  }
  assert.equal(sw.stored.size, 160);
});

test("online pages are never cached; offline navigation gets only the reconnect page", async () => {
  const online = worker();
  assert.equal(
    await (await online.request("/admin", { mode: "navigate" }))?.text(),
    "online",
  );
  assert.equal(online.stored.size, 0);
  const offline = worker({ offline: true });
  offline.stored.set("/offline.html", new Response("Reconnect"));
  assert.equal(
    await (await offline.request("/admin", { mode: "navigate" }))?.text(),
    "Reconnect",
  );
});

test("storage restrictions do not prevent online asset downloads", async () => {
  const sw = worker({ storageDenied: true });
  assert.equal(
    await (
      await sw.request("/_next/static/app.js", { destination: "script" })
    )?.text(),
    "online",
  );
});
