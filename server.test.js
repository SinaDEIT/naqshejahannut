import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "./server.js";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function appForTest() {
  const pool = { async query() { return { rows: [{ ok: 1 }], rowCount: 1 }; } };
  const workerHandler = {
    async fetch(request) {
      return new Response(JSON.stringify({ path: new URL(request.url).pathname }), {
        headers: { "content-type": "application/json" },
      });
    },
  };
  return createApp({
    pool,
    workerHandler,
    env: { ALLOWED_ORIGINS: "https://shop.github.io", TRUST_PROXY_HOPS: "0", ADMIN_KEY: "test-key" },
  });
}

test("health endpoint checks PostgreSQL", async () => {
  await withServer(appForTest(), async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test("CORS preflight permits only the configured GitHub Pages origin", async () => {
  await withServer(appForTest(), async (base) => {
    const allowed = await fetch(`${base}/api/order`, {
      method: "OPTIONS",
      headers: { Origin: "https://shop.github.io", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://shop.github.io");
    assert.match(allowed.headers.get("access-control-allow-headers"), /Authorization/i);

    const blocked = await fetch(`${base}/api/order`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  });
});

test("allowed cross-origin API requests reach the Worker handler", async () => {
  await withServer(appForTest(), async (base) => {
    const response = await fetch(`${base}/products.json`, { headers: { Origin: "https://shop.github.io" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://shop.github.io");
    assert.deepEqual(await response.json(), { path: "/products.json" });
  });
});

test("rejects an unlisted origin before it reaches application routes", async () => {
  await withServer(appForTest(), async (base) => {
    const response = await fetch(`${base}/api/admin/orders`, { headers: { Origin: "https://evil.example" } });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { ok: false, error: "درخواست غیرمجاز." });
  });
});

test("public product and review routes use the existing Worker contracts", async () => {
  const pool = { async query() { return { rows: [], rowCount: 0 }; } };
  const app = createApp({ pool, env: { ALLOWED_ORIGINS: "https://shop.github.io", TRUST_PROXY_HOPS: "0" } });
  await withServer(app, async (base) => {
    const productsResponse = await fetch(`${base}/products.json`, { headers: { Origin: "https://shop.github.io" } });
    assert.equal(productsResponse.status, 200);
    const products = await productsResponse.json();
    assert.ok(Array.isArray(products) && products.length > 0);

    const reviewsResponse = await fetch(`${base}/reviews.json`, { headers: { Origin: "https://shop.github.io" } });
    assert.equal(reviewsResponse.status, 200);
    assert.ok(Array.isArray(await reviewsResponse.json()));

    const invalidOrder = await fetch(`${base}/api/order`, {
      method: "POST",
      headers: { Origin: "https://shop.github.io", "content-type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });
    assert.equal(invalidOrder.status, 400);
    assert.match((await invalidOrder.json()).error, /نام گیرنده/);

    const noAdminKey = await fetch(`${base}/api/admin/orders`);
    assert.equal(noAdminKey.status, 503);
  });
});

test("CORS configuration rejects paths and wildcards", () => {
  const pool = { async query() { return { rows: [], rowCount: 0 }; } };
  assert.throws(() => createApp({ pool, env: { ALLOWED_ORIGINS: "https://shop.github.io/path" } }), /exact HTTP\(S\) origins/);
  assert.throws(() => createApp({ pool, env: { ALLOWED_ORIGINS: "https://*.github.io" } }), /exact HTTP\(S\) origins/);
});
