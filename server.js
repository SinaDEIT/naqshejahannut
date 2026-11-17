import express from "express";
import pg from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import worker from "./worker.js";
import { createD1Compat } from "./backend/pg-adapter.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const { Pool } = pg;

function originsFrom(value) {
  const origins = String(value || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  for (const origin of origins) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`); }
    if (!/^https?:$/.test(parsed.protocol) || parsed.hostname.includes("*") || parsed.origin !== origin) {
      throw new Error(`ALLOWED_ORIGINS entries must be exact HTTP(S) origins without paths: ${origin}`);
    }
  }
  return new Set(origins);
}

function mimeType(filePath) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".woff2": "font/woff2",
  })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function createAssetsBinding(publicDir) {
  const root = path.resolve(publicDir);
  return {
    async fetch(request) {
      const url = new URL(request.url);
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return new Response("Not found", { status: 404 }); }
      if (pathname === "/") pathname = "/index.html";
      const filePath = path.resolve(root, `.${pathname}`);
      if (filePath !== root && !filePath.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
      try {
        const data = await readFile(filePath);
        return new Response(request.method === "HEAD" ? null : data, {
          headers: { "content-type": mimeType(filePath), "cache-control": "public, max-age=60" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  };
}

function toWebHeaders(headers, clientIp, body) {
  const out = new Headers();
  for (const name of ["content-type", "authorization", "origin", "x-telegram-bot-api-secret-token"]) {
    const value = headers[name];
    if (value != null) out.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }
  if (body != null) out.set("content-length", String(body.byteLength));
  // worker.js hashes this header for rate-limits. Set it from Express's trusted-proxy result,
  // never from the caller-supplied header of the same name.
  out.set("cf-connecting-ip", clientIp || "local");
  return out;
}

export function createApp({ pool, workerHandler = worker, env = process.env, publicDir = PUBLIC_DIR }) {
  const app = express();
  const allowedOrigins = originsFrom(env.ALLOWED_ORIGINS);
  const db = createD1Compat(pool);
  const runtimeEnv = {
    DB: db,
    ASSETS: createAssetsBinding(publicDir),
    ADMIN_KEY: env.ADMIN_KEY || "",
    TG_BOT_TOKEN: env.TG_BOT_TOKEN || "",
    TG_CHAT_ID: env.TG_CHAT_ID || "",
    PAY_INFO: env.PAY_INFO || "",
    ALLOWED_ORIGINS: [...allowedOrigins].join(","),
  };

  const proxyHops = Number(env.TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(proxyHops) || proxyHops < 0) throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  app.set("trust proxy", proxyHops);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowedOrigins.has(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.set("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") {
      if (!origin || !allowedOrigins.has(origin)) return res.status(403).end();
      return res.status(204).end();
    }
    if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ ok: false, error: "درخواست غیرمجاز." });
    next();
  });

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  // Keep the existing Worker request handler as the single source of endpoint behavior,
  // while supplying Node/PostgreSQL bindings in place of Cloudflare's D1/ASSETS runtime.
  app.use(express.raw({ type: () => true, limit: "128kb" }));
  app.use(async (req, res) => {
    const base = env.PUBLIC_API_URL
      ? new URL(env.PUBLIC_API_URL).origin
      : env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${env.RAILWAY_PUBLIC_DOMAIN}`
        : `${req.protocol}://${req.get("host")}`;
    const url = new URL(req.originalUrl, `${base}/`).toString();
    let request;
    try {
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : req.body;
      const headers = toWebHeaders(req.headers, req.ip, body);
      request = new Request(url, { method: req.method, headers, body });
    } catch {
      return res.status(400).json({ ok: false, error: "درخواست نامعتبر است." });
    }

    const pending = [];
    const ctx = { waitUntil(promise) { pending.push(Promise.resolve(promise)); } };
    try {
      const response = await workerHandler.fetch(request, runtimeEnv, ctx);
      await Promise.allSettled(pending);
      res.status(response.status);
      response.headers.forEach((value, name) => res.set(name, value));
      const body = Buffer.from(await response.arrayBuffer());
      return res.send(body);
    } catch (error) {
      console.error("request failed", error?.message || error);
      return res.status(500).json({ ok: false, error: "خطای سرور. چند لحظه بعد دوباره تلاش کنید." });
    }
  });

  return app;
}

export async function start() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.ADMIN_KEY) throw new Error("ADMIN_KEY is required");
  if (!originsFrom(process.env.ALLOWED_ORIGINS).size) throw new Error("ALLOWED_ORIGINS must contain at least one exact browser origin");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.PG_POOL_MAX || 10) });
  const schema = await readFile(path.join(ROOT, "backend", "schema.postgres.sql"), "utf8");
  await pool.query(schema);

  const app = createApp({ pool });
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, "0.0.0.0", () => console.log(`Railway API listening on 0.0.0.0:${port}`));
  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return { app, pool, server };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start().catch((error) => {
    console.error("startup failed", error?.message || error);
    process.exitCode = 1;
  });
}
