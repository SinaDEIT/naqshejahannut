/* =====================================================================
   بک‌اند خشکبار نقش جهان — Cloudflare Workers (همراه فایل‌های ثابت سایت)، بدون وابستگی
   طبق run_worker_first در wrangler.jsonc فقط مسیرهای زیر از این فایل رد می‌شوند؛ بقیه‌ی سایت مستقیم و رایگان سرو می‌شود:
     GET  /products.json        فهرست محصولات + تغییرات قیمت/نشان ثبت‌شده در پنل مدیریت (کش ۶۰ ثانیه‌ای)
     GET  /reviews.json         نظرهای فایل reviews.json + نظرهای تأییدشده در دیتابیس (کش ۳ دقیقه‌ای)
     POST /api/order            ثبت سفارش (قیمت‌ها همیشه سمت سرور محاسبه می‌شوند)
     POST /api/review           ثبت نظر (پس از تأیید مدیر منتشر می‌شود)
     POST /api/track            پیگیری سفارش با کد سفارش + شماره موبایل
     POST /api/telegram         دریافت دستورهای بات تلگرام (webhook؛ فقط با هدر محرمانه‌ی تلگرام)
     /api/admin/*               پنل مدیریت (نیاز به ADMIN_KEY)
   اتصال‌ها: D1 با نام DB (در wrangler.jsonc)؛ ADMIN_KEY (Secret)؛ اختیاری: TG_BOT_TOKEN و TG_CHAT_ID
   ===================================================================== */

const FREE_SHIP = 1000000, SHIP_COST = 45000;          // همان مقدارهای main.js
const DEFAULT_W = [250, 500, 1000];
const W_LABEL = { 250: "۲۵۰ گرم", 500: "۵۰۰ گرم", 750: "۷۵۰ گرم", 1000: "۱ کیلوگرم" };
const STATUSES = ["new", "confirmed", "shipped", "delivered", "canceled"];
const BADGES = ["sale", "best", "new"];

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const bad = (m, s = 400) => J({ ok: false, error: m }, s);
const toEn = (s) => String(s).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
const fa = (n) => Number(n).toLocaleString("fa-IR");
async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const ipKey = (req, env) => sha((env.ADMIN_KEY || "") + (req.headers.get("cf-connecting-ip") || "local")).then(h => h.slice(0, 20));

/* ---------- محدودیت تعداد درخواست (ضدسوءاستفاده) ---------- */
const hitCount = async (env, k, win) => (await env.DB.prepare("SELECT COUNT(*) AS n FROM rate_hits WHERE k=? AND ts>?").bind(k, Date.now() - win).first()).n;
async function addHit(env, k) {
  await env.DB.prepare("INSERT INTO rate_hits(k,ts) VALUES(?,?)").bind(k, Date.now()).run();
  if (Math.random() < .05) await env.DB.prepare("DELETE FROM rate_hits WHERE ts<?").bind(Date.now() - 864e5).run();
}

/* ---------- کش پاسخ‌های عمومی (products.json و reviews.json) ----------
   لایه ۱: حافظه‌ی همین Worker (روی workers.dev هم کار می‌کند)؛ لایه ۲: کش لبه‌ی کلادفلر (فقط روی دامنه‌ی اختصاصی فعال می‌شود)
   مرورگر هم ۳۰ ثانیه نگه می‌دارد. سفارش هرگز از این کش‌ها قیمت نمی‌گیرد؛ قیمت‌ها همیشه سمت سرور از دیتابیس حساب می‌شوند. */
const MEM = {};
const edgeKey = (url, name) => new Request(url.origin + "/" + name);
async function cachedJson(ctx, url, name, ttl, build) {
  const mk = (body) => new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=30, s-maxage=${ttl}` } });
  const m = MEM[name];
  if (m && Date.now() - m.t < ttl * 1000) return mk(m.body);
  const edge = typeof caches !== "undefined" ? caches.default : null;
  if (edge) { try { const hit = await edge.match(edgeKey(url, name)); if (hit) return hit; } catch (e) {} }
  const body = await build();
  MEM[name] = { t: Date.now(), body };
  if (edge) ctx.waitUntil(edge.put(edgeKey(url, name), mk(body)).catch(() => {}));
  return mk(body);
}
async function purge(url, name) {                       // پس از تغییر در پنل: کش همین Worker و همین دیتاسنتر پاک می‌شود
  delete MEM[name];
  try { await caches.default.delete(edgeKey(url, name)); } catch (e) {}
}

/* ---------- محصولات: فایل ثابت + تغییرات ثبت‌شده در پنل ---------- */
let PC = { t: 0, v: null };                              // کش ۳۰ ثانیه‌ای داخل همین Worker
async function loadProducts(env, url) {
  if (PC.v && Date.now() - PC.t < 30000) return PC.v;
  const base = await (await env.ASSETS.fetch(new Request(new URL("/products.json", url)))).json();
  const ov = {};
  if (env.DB) {
    try { for (const r of (await env.DB.prepare("SELECT id,data FROM product_overrides").all()).results) ov[r.id] = JSON.parse(r.data); } catch (e) {}
  }
  return (PC = { t: Date.now(), v: { base, ov } }).v;
}
function applyOverrides({ base, ov }, keepHidden) {
  return base.filter(p => keepHidden || !(ov[p.id] && ov[p.id].hidden)).map(p => {
    const o = ov[p.id]; if (!o) return p;
    const q = { ...p };
    for (const k of ["price", "old", "badge"]) if (k in o) { if (o[k] == null) delete q[k]; else q[k] = o[k]; }
    if (o.hidden) q.hidden = true;
    return q;
  });
}

/* ---------- نظرها ---------- */
const faDate = (iso) => { try { return new Date(String(iso).replace(" ", "T") + "Z").toLocaleDateString("fa-IR", { dateStyle: "long" }); } catch (e) { return ""; } };
async function allReviews(env, url) {
  let out = [];
  try { const s = await (await env.ASSETS.fetch(new Request(new URL("/reviews.json", url)))).json(); if (Array.isArray(s)) out = s; } catch (e) {}
  if (env.DB) {
    const rs = (await env.DB.prepare("SELECT pid,name,rating,body,created_at FROM shop_reviews WHERE approved=1 ORDER BY id DESC LIMIT 200").all()).results;
    out = rs.map(r => ({ n: r.name || "", r: r.rating, t: r.body, d: faDate(r.created_at), pid: r.pid || "" })).concat(out);
  }
  return out;
}

/* ---------- ثبت سفارش ---------- */
async function readJson(req, max) {
  if (Number(req.headers.get("content-length") || 0) > max) return null;
  try { const t = await req.text(); return t.length > max ? null : JSON.parse(t); } catch (e) { return null; }
}
function orderCode() { const a = new Uint32Array(1); crypto.getRandomValues(a); return "NJ-" + (100000 + a[0] % 900000); }

function priceCart(prods, raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 30) return { error: "سبد خرید خالی یا نامعتبر است." };
  const byId = Object.fromEntries(prods.map(p => [p.id, p])), merged = new Map();
  for (const it of raw) {
    const p = it && byId[String(it.id)], g = Number(it && it.g), q = Number(it && it.q);
    if (!p || p.price == null) return { error: "یکی از محصولات سبد دیگر موجود نیست. سبد را بازبینی کنید." };
    if (!(Array.isArray(p.w) ? p.w : DEFAULT_W).includes(g) || !W_LABEL[g]) return { error: "وزن انتخاب‌شده معتبر نیست." };
    if (!Number.isInteger(q) || q < 1 || q > 50) return { error: "تعداد معتبر نیست." };
    const k = p.id + "|" + g, cur = merged.get(k) || { id: p.id, name: p.name, g, q: 0, unit: Math.round(p.price * g / 1000) };
    cur.q += q; if (cur.q > 50) return { error: "تعداد معتبر نیست." };
    merged.set(k, cur);
  }
  const items = [...merged.values()], subtotal = items.reduce((s, i) => s + i.unit * i.q, 0), shipping = subtotal >= FREE_SHIP ? 0 : SHIP_COST;
  return { items, subtotal, shipping, total: subtotal + shipping };
}

/* هسته‌ی ثبت سفارش: هم سایت و هم بات تلگرام از همین استفاده می‌کنند (قیمت‌ها همیشه سمت سرور حساب می‌شوند) */
async function placeOrder(env, ctx, url, b, ip, src) {
  const name = clip(b.name, 80), phone = toEn(clip(b.phone, 20)), province = clip(b.province, 40), city = clip(b.city, 60), address = clip(b.address, 400), note = clip(b.note, 300);
  if (name.length < 2) return { error: "نام گیرنده را وارد کنید." };
  if (!/^09\d{9}$/.test(phone)) return { error: "شماره تماس معتبر نیست." };
  if (!city) return { error: "شهر را مشخص کنید." };
  if (address.length < 5) return { error: "آدرس کامل را وارد کنید." };
  const pc = priceCart(applyOverrides(await loadProducts(env, url), false), b.items);
  if (pc.error) return pc;
  const { items, subtotal, shipping, total } = pc;

  if (await hitCount(env, "o:" + ip, 600000) >= 5) return { error: "تعداد سفارش‌های شما در این بازه زیاد بود. چند دقیقه بعد دوباره تلاش کنید.", status: 429 };

  try { await ensureCustomers(env); } catch (e) { console.error("customers init", e && e.message); }   // قبل از درج این سفارش، تا مشتری‌های قبلی درست وارد شوند
  let code = "";
  for (let i = 0; i < 6 && !code; i++) {
    const c = orderCode();
    try {
      await env.DB.prepare("INSERT INTO shop_orders(code,name,phone,province,city,address,note,items_json,subtotal,shipping,total,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(c, name, phone, province, city, address, note, JSON.stringify(items), subtotal, shipping, total, ip).run();
      code = c;
    } catch (e) { if (!/UNIQUE/i.test(String(e && e.message))) throw e; }
  }
  if (!code) return { error: "ثبت سفارش انجام نشد. دوباره تلاش کنید.", status: 500 };
  await addHit(env, "o:" + ip);

  let isNew = true;                                          // ثبت/به‌روزرسانی مشتری در فهرست مخاطبین (خطا نباید جلوی ثبت سفارش را بگیرد)
  try { isNew = await touchCustomer(env, phone, name, src === "bot" ? "bot" : "site"); } catch (e) { console.error("customer upsert", e && e.message); }

  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    const text = `${isNew ? "🆕 مشتری جدید" : "🔁 مشتری قبلی"} — سفارش ${code}\n${name} — ${phone}\n${province} ${city}\n${address}\n\n` +
      items.map(i => `• ${i.name} — ${W_LABEL[i.g]} × ${fa(i.q)} = ${fa(i.unit * i.q)}`).join("\n") +
      `\n\nارسال: ${shipping ? fa(shipping) : "رایگان"}\nجمع کل: ${fa(total)} تومان` + (note ? `\nتوضیح: ${note}` : "");
    for (const id of tgIds(env)) ctx.waitUntil(fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: id, text: text.slice(0, 3800) })
    }).catch(() => {}));
  }
  return { ok: true, code, subtotal, shipping, total, items };
}

async function createOrder(req, env, ctx, url) {
  const b = await readJson(req, 20000);
  if (!b || typeof b !== "object") return bad("درخواست نامعتبر است.");
  const r = await placeOrder(env, ctx, url, b, await ipKey(req, env));
  return r.error ? bad(r.error, r.status || 400) : J({ ok: true, code: r.code, subtotal: r.subtotal, shipping: r.shipping, total: r.total });
}

async function createReview(req, env, url) {
  const b = await readJson(req, 4000);
  if (!b || typeof b !== "object") return bad("درخواست نامعتبر است.");
  const rating = Number(b.rating), body = clip(b.text, 400), name = clip(b.name, 30);
  let pid = clip(b.pid, 20);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad("امتیاز معتبر نیست.");
  if (body.length < 10) return bad("متن نظر باید دست‌کم ۱۰ حرف باشد.");
  if (pid && !(await loadProducts(env, url)).base.some(p => p.id === pid)) pid = "";
  const ip = await ipKey(req, env);
  if (await hitCount(env, "r:" + ip, 600000) >= 3) return bad("چند دقیقه بعد دوباره تلاش کنید.", 429);
  await env.DB.prepare("INSERT INTO shop_reviews(pid,name,rating,body,ip_hash) VALUES(?,?,?,?,?)").bind(pid, name, rating, body, ip).run();
  await addHit(env, "r:" + ip);
  return J({ ok: true });
}

/* ---------- پیگیری سفارش (کد سفارش + شماره موبایل) ---------- */
async function trackOrder(req, env) {
  const b = await readJson(req, 1000);
  if (!b || typeof b !== "object") return bad("درخواست نامعتبر است.");
  const code = toEn(clip(b.code, 20)).toUpperCase().replace(/^NJ-?/, ""), phone = toEn(clip(b.phone, 20));
  if (!/^\d{6}$/.test(code) || !/^09\d{9}$/.test(phone)) return bad("کد سفارش یا شماره موبایل معتبر نیست.");
  const ip = "t:" + await ipKey(req, env);
  if (await hitCount(env, ip, 600000) >= 15) return bad("تعداد تلاش‌ها زیاد بود. چند دقیقه بعد دوباره امتحان کنید.", 429);
  await addHit(env, ip);
  const o = await env.DB.prepare("SELECT code,status,items_json,subtotal,shipping,total,created_at FROM shop_orders WHERE code=? AND phone=?").bind("NJ-" + code, phone).first();
  if (!o) return bad("سفارشی با این مشخصات پیدا نشد.", 404);
  return J({ ok: true, order: { code: o.code, status: o.status, date: faDate(o.created_at), subtotal: o.subtotal, shipping: o.shipping, total: o.total, items: JSON.parse(o.items_json).map(i => ({ name: i.name, g: i.g, q: i.q })) } });
}

/* ---------- پنل مدیریت ---------- */
async function isAdmin(req, env) {
  const key = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_KEY || !key) return false;
  const [a, b] = await Promise.all([sha(key), sha(env.ADMIN_KEY)]);
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function admin(req, env, url, path) {
  if (!env.ADMIN_KEY) return bad("متغیر ADMIN_KEY در Secrets سرویس Railway تنظیم نشده است.", 503);
  const ip = "a:" + await ipKey(req, env);
  if (await hitCount(env, ip, 600000) >= 10) return bad("تلاش‌های ناموفق زیاد بود. ۱۰ دقیقه صبر کنید.", 429);
  if (!(await isAdmin(req, env))) { await addHit(env, ip); return bad("کلید مدیریت نادرست است.", 401); }
  const post = req.method === "POST", b = post ? await readJson(req, 4000) : null;
  if (post && !b) return bad("درخواست نامعتبر است.");

  if (path === "orders" && !post) {
    const st = url.searchParams.get("status");
    const has = STATUSES.includes(st), cols = "id,code,name,phone,province,city,address,note,items_json,subtotal,shipping,total,status,created_at";
    const [list, cnt] = await Promise.all([
      (has ? env.DB.prepare(`SELECT ${cols} FROM shop_orders WHERE status=? ORDER BY id DESC LIMIT 100`).bind(st) : env.DB.prepare(`SELECT ${cols} FROM shop_orders ORDER BY id DESC LIMIT 100`)).all(),
      (has ? env.DB.prepare("SELECT COUNT(*) AS n FROM shop_orders WHERE status=?").bind(st) : env.DB.prepare("SELECT COUNT(*) AS n FROM shop_orders")).first()
    ]);
    const rows = list.results.map(r => ({ ...r, items: JSON.parse(r.items_json), items_json: undefined }));
    return J({ ok: true, orders: rows, count: cnt.n });
  }
  if (path === "telegram-setup" && post) {              // یک‌بار از پنل زده می‌شود: webhook و منوی دستورها را در تلگرام ثبت می‌کند
    if (!env.TG_BOT_TOKEN) return bad("TG_BOT_TOKEN در تنظیمات Worker ثبت نشده است.");
    const hook = url.origin + "/api/telegram";
    const r1 = await (await tgApi(env, "setWebhook", { url: hook, secret_token: await tgSecret(env), allowed_updates: ["message", "callback_query"], drop_pending_updates: true })).json();
    if (!r1.ok) return bad("تلگرام پذیرفت نکرد: " + clip(r1.description, 120));
    const pub = [{ command: "start", description: "راهنما" }, { command: "order", description: "ثبت سفارش" }, { command: "cart", description: "سبد خرید" }, { command: "track", description: "پیگیری سفارش (کد + شماره)" }, { command: "cancel", description: "لغو سفارش در حال ثبت" }];
    await tgApi(env, "setMyCommands", { commands: pub }).catch(() => {});
    const adm = pub.concat([{ command: "products", description: "فهرست محصولات و قیمت‌ها" }, { command: "catalog", description: "۱۰ سفارش آخر" }, { command: "contacts", description: "فایل مخاطبین مشتریان" }, { command: "manage", description: "مدیریت و حذف مخاطبین با دکمه" }]);
    for (const id of tgIds(env)) if (/^-?\d+$/.test(id)) await tgApi(env, "setMyCommands", { commands: adm, scope: { type: "chat", chat_id: Number(id) } }).catch(() => {});
    return J({ ok: true, webhook: hook });
  }
  if (path === "telegram-status" && post) {             // عیب‌یابی بات: توکن، گروه‌ها و وضعیت webhook را از خود تلگرام می‌پرسد
    const out = { ok: true, token: !!env.TG_BOT_TOKEN, chats: tgIds(env).length, expected: url.origin + "/api/telegram" };
    if (!env.TG_BOT_TOKEN) return J(out);
    const [me, wh] = await Promise.all([tgApi(env, "getMe", {}).then(r => r.json()).catch(() => ({})), tgApi(env, "getWebhookInfo", {}).then(r => r.json()).catch(() => ({}))]);
    const i = wh.result || {};
    return J({ ...out, botOk: !!me.ok, bot: me.result ? me.result.username : "", webhook: i.url || "", pending: i.pending_update_count || 0, lastError: clip(i.last_error_message || "", 200), lastErrorDate: i.last_error_date || 0 });
  }
  if (path === "order-delete" && post) {
    const code = clip(b.code, 20);
    if (!/^NJ-\d{6}$/.test(code)) return bad("کد سفارش نامعتبر است.");
    const r = await env.DB.prepare("DELETE FROM shop_orders WHERE code=?").bind(code).run();
    return J({ ok: true, deleted: (r.meta && r.meta.changes) || 0 });
  }
  if (path === "orders-delete" && post) {              // حذف گروهی: همه‌ی سفارش‌ها یا فقط یک وضعیت
    if (b.confirm !== "DELETE") return bad("تأیید حذف ارسال نشد.");
    if (b.status !== "all" && !STATUSES.includes(b.status)) return bad("وضعیت نامعتبر است.");
    const r = await (b.status === "all" ? env.DB.prepare("DELETE FROM shop_orders") : env.DB.prepare("DELETE FROM shop_orders WHERE status=?").bind(b.status)).run();
    return J({ ok: true, deleted: (r.meta && r.meta.changes) || 0 });
  }
  if (path === "order-status" && post) {
    if (!STATUSES.includes(b.status) || !b.code) return bad("وضعیت نامعتبر است.");
    await env.DB.prepare("UPDATE shop_orders SET status=? WHERE code=?").bind(b.status, String(b.code)).run();
    return J({ ok: true });
  }
  if (path === "reviews" && !post) {
    const rows = (await env.DB.prepare("SELECT id,pid,name,rating,body,approved,created_at FROM shop_reviews WHERE approved=? ORDER BY id DESC LIMIT 200").bind(url.searchParams.get("approved") === "1" ? 1 : 0).all()).results;
    return J({ ok: true, reviews: rows });
  }
  if (path === "review" && post) {
    const id = Number(b.id);
    if (!Number.isInteger(id)) return bad("شناسه نامعتبر است.");
    if (b.action === "approve") await env.DB.prepare("UPDATE shop_reviews SET approved=1 WHERE id=?").bind(id).run();
    else if (b.action === "delete") await env.DB.prepare("DELETE FROM shop_reviews WHERE id=?").bind(id).run();
    else return bad("عمل نامعتبر است.");
    await purge(url, "reviews.json");
    return J({ ok: true });
  }
  if (path === "products" && !post) {
    const pc = await loadProducts(env, url), merged = applyOverrides(pc, true);
    return J({ ok: true, products: merged.map((p, i) => ({ id: p.id, name: p.name, cat: p.cat, price: p.price == null ? null : p.price, old: p.old || null, badge: p.badge || "", hidden: !!p.hidden, changed: !!pc.ov[p.id], base: { price: pc.base[i].price == null ? null : pc.base[i].price, old: pc.base[i].old || null, badge: pc.base[i].badge || "" } })) });
  }
  if (path === "product" && post) {
    const pc = await loadProducts(env, url), id = String(b.id || "");
    if (!pc.base.some(p => p.id === id)) return bad("محصول پیدا نشد.");
    if (b.reset) { await env.DB.prepare("DELETE FROM product_overrides WHERE id=?").bind(id).run(); PC.t = 0; await purge(url, "products.json"); return J({ ok: true }); }
    const num = (v) => (v == null || v === "" ? null : Number(v));
    const price = num(b.price), old = num(b.old), badge = BADGES.includes(b.badge) ? b.badge : null;
    if (price != null && !(Number.isInteger(price) && price >= 1000 && price <= 2e9)) return bad("قیمت معتبر نیست (عدد صحیح به تومان، برای هر کیلوگرم).");
    if (old != null && !(Number.isInteger(old) && old >= 1000 && old <= 2e9)) return bad("قیمت قبلی معتبر نیست.");
    if (old != null && price != null && old <= price) return bad("قیمت قبلی باید از قیمت فعلی بیشتر باشد.");
    await env.DB.prepare("INSERT INTO product_overrides(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP")
      .bind(id, JSON.stringify({ price, old, badge, hidden: !!b.hidden })).run();
    PC.t = 0; await purge(url, "products.json");
    return J({ ok: true });
  }
  return bad("مسیر پیدا نشد.", 404);
}

/* ---------- بات تلگرام: دستورها (/start ، /products ، /catalog) ----------
   تلگرام پیام‌ها را با webhook به /api/telegram می‌فرستد. امنیت:
   ۱) هدر محرمانه‌ی تلگرام باید درست باشد (از روی ADMIN_KEY ساخته می‌شود، نیاز به Secret جدید نیست)
   ۲) فقط چت‌های ثبت‌شده در TG_CHAT_ID (می‌تواند چند مورد با ویرگول باشد: گروه + مدیر؛ شناسه‌ی عددی یا @یوزرنیم در چت خصوصی)
      به /catalog (۱۰ سفارش آخر) و /products دسترسی دارند؛
   ۳) بقیه‌ی مردم فقط می‌توانند با /track کد‌سفارش شماره، همان یک سفارش را ببینند (کد و شماره باید با هم درست باشند). */
const CAT_LABEL = { pistachio: "پسته", mixed: "آجیل مخلوط", nokhodchi: "نخودچی", almond: "بادام", walnut: "گردو", hazelnut: "فندق", raisin: "کشمش و مویز", date: "خرما", fruit: "میوه خشک", legumes: "حبوبات", seeds: "تخمه", honey: "عسل" };
const ST_FA = { new: "🆕 جدید", confirmed: "✅ تأییدشده", shipped: "🚚 ارسال‌شده", delivered: "📦 تحویل‌شده", canceled: "❌ لغوشده" };
const tgSecret = (env) => sha("njk-tg|" + (env.ADMIN_KEY || ""));
const tgApi = (env, method, body) => fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const tehran = (s) => { try { return new Date(String(s).replace(" ", "T") + "Z").toLocaleString("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" }); } catch (e) { return String(s); } };
const TG_MENU = { inline_keyboard: [[{ text: "📦 محصولات", callback_data: "products" }, { text: "🧾 ۱۰ سفارش آخر", callback_data: "catalog" }], [{ text: "👥 مدیریت مخاطبین", callback_data: "cl:0:a" }]] };

async function tgSend(env, chat, text, markup, html) {
  const parts = []; let cur = "";
  for (const line of String(text).split("\n")) {
    if (cur && (cur + "\n" + line).length > 3800) { parts.push(cur); cur = line; } else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  for (let i = 0; i < parts.length; i++)
    await tgApi(env, "sendMessage", { chat_id: chat, text: parts[i], ...(html ? { parse_mode: "HTML" } : {}), ...(markup && i === parts.length - 1 ? { reply_markup: markup } : {}) });
}
const tgIds = (env) => String(env.TG_CHAT_ID || "").split(/[,\s]+/).filter(Boolean);   // مثلاً: -1001234567890,123456789 (گروه + مدیر)
function tgAllowed(env, chat, from) {
  return tgIds(env).some(w => {
    w = w.replace(/^@/, "").toLowerCase();
    return String(chat.id) === w || (chat.type === "private" && !!from && !!from.username && String(from.username).toLowerCase() === w);
  });
}
const TG_CUSTOMER_HELP = "سلام 👋\nبه بات فروشگاه خشکبار نقش جهان خوش آمدید.\n\n🛍 ثبت سفارش: /order\n🛒 سبد خرید: /cart\n\nبرای پیگیری سفارش، کد سفارش و شمارهٔ موبایلی که با آن سفارش داده‌اید را بفرستید (با زدن روی نمونهٔ زیر کپی می‌شود):\n<code>/track NJ-123456 09121234567</code>\n\n(کد سفارش را هنگام ثبت سفارش در سایت دریافت کرده‌اید. فقط سفارشی نشان داده می‌شود که کد و شمارهٔ آن با هم درست باشند.)";
async function tgTrackText(env, from, args) {
  const toks = toEn(args).split(/[\s,،:]+/).filter(Boolean);
  const codeTok = toks.find(t => /^(nj-?)?\d{6}$/i.test(t)), phone = toks.find(t => /^09\d{9}$/.test(t));
  if (!codeTok || !phone) return "کد سفارش یا شمارهٔ موبایل معتبر نیست.\n\nنمونه:\n/track NJ-123456 09121234567";
  const key = "t:tg" + (from && from.id || 0);
  if (await hitCount(env, key, 600000) >= 15) return "تعداد تلاش‌ها زیاد بود. چند دقیقه بعد دوباره امتحان کنید.";
  await addHit(env, key);
  const code = "NJ-" + codeTok.replace(/^nj-?/i, "");
  const o = await env.DB.prepare("SELECT code,status,items_json,shipping,total,created_at FROM shop_orders WHERE code=? AND phone=?").bind(code, phone).first();
  if (!o) return "سفارشی با این مشخصات پیدا نشد.";
  let items = []; try { items = JSON.parse(o.items_json); } catch (e) {}
  return [`🔎 سفارش ${o.code}`, `وضعیت: ${ST_FA[o.status] || o.status}`, `🕐 ${tehran(o.created_at)}`,
    `🛒 ${items.map(x => `${x.name} (${W_LABEL[x.g] || x.g}) × ${fa(x.q)}`).join("، ")}`,
    `💰 جمع کل: ${fa(o.total)} تومان` + (o.shipping ? ` (شامل ارسال ${fa(o.shipping)})` : " (ارسال رایگان)")].join("\n");
}
const TG_HELP = "سلام 👋\nبه پنل بات فروشگاه خشکبار نقش جهان خوش آمدید.\n\nدستورها:\n/products — فهرست محصولات و قیمت‌ها (تومان، هر کیلوگرم)\n/catalog — ۱۰ سفارش آخر\n/track کد شماره — پیگیری یک سفارش\n/contacts — فایل مخاطبین مشتریان (نام و شماره)\n/manage — مدیریت مخاطبین با دکمه (حذف هر مخاطب)\n/order — ثبت سفارش (مثل مشتری)\n/start — نمایش همین راهنما\n\nاعلان سفارش‌های جدید هم در همین چت ارسال می‌شود.";

async function tgProductsText(env, url) {
  const list = applyOverrides(await loadProducts(env, url), true), out = [`📦 فهرست محصولات (${fa(list.length)} مورد) — قیمت هر کیلوگرم، تومان`];
  const cats = Object.keys(CAT_LABEL).concat([...new Set(list.map(p => p.cat))].filter(c => !(c in CAT_LABEL)));
  for (const c of cats) {
    const ps = list.filter(p => p.cat === c); if (!ps.length) continue;
    out.push("", `■ ${CAT_LABEL[c] || c}`);
    for (const p of ps) out.push(`• ${p.name} — ${p.price == null ? "تماس بگیرید" : fa(p.price)}${p.hidden ? " (مخفی از سایت)" : ""}`);
  }
  return out.join("\n");
}
async function tgCatalogText(env) {
  const [list, cnt] = await Promise.all([
    env.DB.prepare("SELECT code,name,phone,province,city,items_json,shipping,total,status,created_at FROM shop_orders ORDER BY id DESC LIMIT 10").all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM shop_orders").first()
  ]);
  if (!list.results.length) return "هنوز سفارشی ثبت نشده است.";
  const out = [`🧾 ${fa(list.results.length)} سفارش آخر (از ${fa(cnt.n)} سفارش)`];
  list.results.forEach((o, i) => {
    let items = []; try { items = JSON.parse(o.items_json); } catch (e) {}
    out.push("", `${fa(i + 1)}) ${o.code} — ${ST_FA[o.status] || o.status}`, `🕐 ${tehran(o.created_at)}`, `👤 ${o.name} — ${o.phone}`, `📍 ${o.province ? o.province + " " : ""}${o.city}`,
      `🛒 ${items.map(x => `${x.name} (${W_LABEL[x.g] || x.g}) × ${fa(x.q)}`).join("، ")}`, `💰 جمع کل: ${fa(o.total)} تومان`);
  });
  return out.join("\n");
}

/* ---------- ثبت سفارش داخل بات (فقط در چت خصوصی) ----------
   وضعیت هر گفتگو (سبد، مرحله‌ی فرم، رسید) در جدول tg_sessions نگه داشته می‌شود (خودکار ساخته می‌شود) و بعد از ۲۴ ساعت بی‌فعالیتی منقضی می‌شود. */
const TGO_PAGE = 8, MAX_RECEIPT = 3 * 1024 * 1024, MIN_SIDE = 500;
let TG_READY = false;
async function tgInit(env) {
  if (TG_READY) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS tg_sessions (chat TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '{}', updated INTEGER NOT NULL)").run();
  TG_READY = true;
}
async function getSess(env, chat) {
  await tgInit(env);
  const r = await env.DB.prepare("SELECT state,data,updated FROM tg_sessions WHERE chat=?").bind(String(chat)).first();
  const s = { state: "", cart: [], form: {}, receipt: null };
  if (r && Date.now() - r.updated < 864e5) { try { Object.assign(s, JSON.parse(r.data), { state: r.state }); } catch (e) {} }
  return s;
}
async function putSess(env, chat, s) {
  const { state, ...rest } = s;
  await env.DB.prepare("INSERT INTO tg_sessions(chat,state,data,updated) VALUES(?,?,?,?) ON CONFLICT(chat) DO UPDATE SET state=excluded.state,data=excluded.data,updated=excluded.updated").bind(String(chat), state || "", JSON.stringify(rest), Date.now()).run();
  if (Math.random() < .02) await env.DB.prepare("DELETE FROM tg_sessions WHERE updated<?").bind(Date.now() - 3 * 864e5).run();
}
async function delSess(env, chat) { await tgInit(env); await env.DB.prepare("DELETE FROM tg_sessions WHERE chat=?").bind(String(chat)).run(); }

async function tgShow(env, chat, mid, text, rows, html) {            // با mid پیام قبلی ویرایش می‌شود (چت شلوغ نمی‌شود)، وگرنه پیام جدید
  const markup = rows ? { inline_keyboard: rows } : undefined;
  if (mid) {
    try {
      const r = await (await tgApi(env, "editMessageText", { chat_id: chat, message_id: mid, text: String(text).slice(0, 3900), ...(html ? { parse_mode: "HTML" } : {}), ...(markup ? { reply_markup: markup } : {}) })).json();
      if (r.ok || /not modified/i.test(r.description || "")) return;
    } catch (e) {}
  }
  await tgSend(env, chat, text, markup, html);
}
const btn = (t, d) => ({ text: t, callback_data: d });
const CANCEL = [[btn("❌ لغو سفارش", "x")]];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (s) => `<code>${esc(s)}</code>`;                    // در تلگرام با یک لمس روی این متن، کپی می‌شود
function copyable(info) {                                        // شماره کارت/شبا/حساب داخل متن پرداخت را قابل‌کپی می‌کند (ارقام انگلیسی و بدون خط‌تیره برای کارت)
  return esc(info).replace(/\s*\|\s*/g, "\n").replace(/(IR\s?[0-9۰-۹][0-9۰-۹ ]{20,28}[0-9۰-۹])|([0-9۰-۹][0-9۰-۹\- ]{6,}[0-9۰-۹])/gi, (m) => {
    const e = toEn(m).trim(), d = e.replace(/[\s-]/g, "");
    return `<code>${/^IR/i.test(e) || d.length === 16 ? d : e}</code>`;
  });
}
const orderable = async (env, url) => applyOverrides(await loadProducts(env, url), false).filter(p => p.price != null);
const wList = (p) => (Array.isArray(p.w) ? p.w : DEFAULT_W).filter(g => W_LABEL[g]);
const unitOf = (p, g) => Math.round(p.price * g / 1000);
const nrm = (s) => toEn(String(s)).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s\u200c\u200e\u200f]+/g, "").toLowerCase();
const linesOf = (items) => items.map(i => `• ${i.name} — ${W_LABEL[i.g]} × ${fa(i.q)} = ${fa(i.unit * i.q)}`).join("\n");
const totalsOf = (pc) => `ارسال: ${pc.shipping ? fa(pc.shipping) : "رایگان"}\n💰 جمع کل: ${fa(pc.total)} تومان`;
function cleanCart(prods, cart) {                               // محصولی که مخفی/بی‌قیمت شده یا وزنش نامعتبر شده از سبد حذف می‌شود
  const by = Object.fromEntries(prods.map(p => [p.id, p]));
  return (Array.isArray(cart) ? cart : []).filter(c => by[c.id] && wList(by[c.id]).includes(c.g) && c.q >= 1);
}

function pgMain(s, prods) {
  const order = Object.keys(CAT_LABEL), present = [...new Set(prods.map(p => p.cat))];
  const cats = order.filter(c => present.includes(c)).concat(present.filter(c => !order.includes(c))), rows = [];
  for (let i = 0; i < cats.length; i += 2) rows.push(cats.slice(i, i + 2).map(c => btn(CAT_LABEL[c] || c, `c:${c}:0`)));
  rows.push([btn("🔍 جستجوی محصول", "s"), btn(`🛒 سبد خرید (${fa(s.cart.length)})`, "cart")]);
  if (s.cart.length) rows.push([btn("✅ تکمیل سفارش", "ck")]);
  return ["🛍 ثبت سفارش\n\nدستهٔ محصول را انتخاب کنید، یا با «🔍 جستجو» نام محصول را بنویسید.", rows];
}
function pgCat(prods, cat, page) {
  const list = prods.filter(p => p.cat === cat), pages = Math.max(1, Math.ceil(list.length / TGO_PAGE));
  page = Math.min(Math.max(parseInt(page) || 0, 0), pages - 1);
  const rows = list.slice(page * TGO_PAGE, (page + 1) * TGO_PAGE).map(p => [btn(`${p.name} — ${fa(p.price)}`, "p:" + p.id)]), nav = [];
  if (page > 0) nav.push(btn("◀️ قبلی", `c:${cat}:${page - 1}`));
  if (page < pages - 1) nav.push(btn("بعدی ▶️", `c:${cat}:${page + 1}`));
  if (nav.length) rows.push(nav);
  rows.push([btn("🏠 صفحهٔ اول", "m")]);
  return [`📂 ${CAT_LABEL[cat] || cat}\nقیمت‌ها به تومان و برای هر کیلوگرم است. محصول را انتخاب کنید:` + (pages > 1 ? `\n(صفحهٔ ${fa(page + 1)} از ${fa(pages)})` : ""), rows];
}
function pgProd(p) {
  const rows = wList(p).map(g => [btn(`${W_LABEL[g]} — ${fa(unitOf(p, g))} تومان`, `w:${p.id}:${g}`)]);
  rows.push([btn("◀️ بازگشت", `c:${p.cat}:0`), btn("🏠 صفحهٔ اول", "m")]);
  return [`🛒 ${p.name}\nقیمت هر کیلوگرم: ${fa(p.price)} تومان\n\nوزن بسته را انتخاب کنید:`, rows];
}
const pgQty = (p, g) => [`${p.name} — ${W_LABEL[g]}\nچند بسته می‌خواهید؟`, [[1, 2, 3, 4, 5].map(n => btn(fa(n), `q:${p.id}:${g}:${n}`)), [btn("✏️ تعداد دیگر", `qx:${p.id}:${g}`)], [btn("◀️ بازگشت", "p:" + p.id)]]];
function pgCart(s, prods) {
  if (!s.cart.length) return ["🛒 سبد خرید شما خالی است.", [[btn("🛍 انتخاب محصول", "m")]]];
  const pc = priceCart(prods, s.cart);
  if (pc.error) return [pc.error, [[btn("🧹 خالی‌کردن سبد", "clr"), btn("🏠 صفحهٔ اول", "m")]]];
  const rows = pc.items.map(i => [btn("➖", `dq:${i.id}:${i.g}`), btn(`✏️ ${i.name} (${W_LABEL[i.g]}) × ${fa(i.q)}`, `eq:${i.id}:${i.g}`), btn("➕", `iq:${i.id}:${i.g}`)]);
  rows.push([btn("➕ محصول دیگر", "m"), btn("✅ تکمیل سفارش", "ck")], [btn("🧹 خالی‌کردن سبد", "clr")]);
  return [`🛒 سبد خرید شما\n\n${linesOf(pc.items)}\n\nمجموع کالاها: ${fa(pc.subtotal)} تومان\n${totalsOf(pc)}` + (pc.shipping ? `\n(ارسال برای خرید بالای ${fa(FREE_SHIP)} تومان رایگان است)` : "") +
    "\n\n➖ و ➕ تعداد را کم و زیاد می‌کنند (با ➖ روی تعداد ۱، محصول حذف می‌شود). روی نام محصول بزنید تا تعداد دقیق را بنویسید.", rows];
}
function pgReview(s, pc) {
  const f = s.form;
  return [`📋 بازبینی سفارش\n\n👤 ${f.name}\n📞 ${f.phone}\n📍 ${f.province ? f.province + "، " : ""}${f.city}\n🏠 ${f.address}` + (f.note ? `\n📝 ${f.note}` : "") + `\n\n${linesOf(pc.items)}\n\n${totalsOf(pc)}`,
    [[btn("✅ تأیید و رفتن به پرداخت", "pay")], [btn("✏️ ویرایش مشخصات", "ck"), btn("🛒 ویرایش سبد", "cart")], [btn("❌ لغو سفارش", "x")]]];
}
async function tgAdd(env, chat, s, prods, p, g, n, show) {
  const e = s.cart.find(c => c.id === p.id && c.g === g);
  let msg;
  if (e) { e.q = Math.min(50, e.q + n); msg = `✅ ${p.name} (${W_LABEL[g]}) از قبل در سبد بود؛ ${fa(n)} عدد به آن اضافه شد و اکنون ${fa(e.q)} عدد است.`; }
  else { if (s.cart.length >= 30) return show(["سبد خرید پر است (حداکثر ۳۰ ردیف). اول سفارش فعلی را تکمیل کنید.", [[btn("🛒 مشاهدهٔ سبد", "cart")]]]); s.cart.push({ id: p.id, g, q: n }); msg = `✅ ${fa(n)} × ${p.name} (${W_LABEL[g]}) به سبد اضافه شد.`; }
  s.state = ""; await putSess(env, chat, s);
  const pc = priceCart(prods, s.cart);
  return show([msg + (pc.error ? "" : `\n\n🛒 جمع سبد تا اینجا: ${fa(pc.subtotal)} تومان`) + "\n\nمحصول دیگری هم لازم دارید؟",
    [[btn("➕ بله، محصول دیگر", "m")], [btn("✅ نه، تکمیل سفارش", "ck")], [btn("✏️ اصلاح تعداد این محصول", `eq:${p.id}:${g}`), btn("🛒 مشاهدهٔ سبد", "cart")]]]);
}
async function tgToReview(env, chat, s, prods, show) {
  const pc = priceCart(prods, s.cart);
  if (pc.error) return show(pgCart(s, prods));
  s.state = "review"; await putSess(env, chat, s);
  return show(pgReview(s, pc));
}
async function tgOrderStart(env, url, chat, cart) {
  const prods = await orderable(env, url), s = await getSess(env, chat);
  s.cart = cleanCart(prods, s.cart); s.state = ""; await putSess(env, chat, s);
  const pg = cart ? pgCart(s, prods) : pgMain(s, prods);
  await tgShow(env, chat, null, pg[0], pg[1]);
}

async function tgOrderCb(env, ctx, url, chat, from, mid, d) {
  const prods = await orderable(env, url), s = await getSess(env, chat), by = Object.fromEntries(prods.map(p => [p.id, p]));
  const show = (pg) => tgShow(env, chat, mid, pg[0], pg[1], pg[2]), save = () => putSess(env, chat, s);
  const [k, a, b, c] = d.split(":"), p = by[a], g = Number(b);
  if (d === "m") { s.state = ""; await save(); return show(pgMain(s, prods)); }
  if (k === "c") return show(pgCat(prods, a, b));
  if (k === "p") { if (!p) return show(pgMain(s, prods)); s.state = ""; await save(); return show(pgProd(p)); }
  if (k === "w") return p && wList(p).includes(g) ? show(pgQty(p, g)) : show(pgMain(s, prods));
  if (k === "q") { const n = Number(c); return p && wList(p).includes(g) && n >= 1 && n <= 50 ? tgAdd(env, chat, s, prods, p, g, n, show) : show(pgMain(s, prods)); }
  if (k === "qx") {
    if (!p || !wList(p).includes(g)) return show(pgMain(s, prods));
    s.state = "qty"; s.pid = p.id; s.g = g; await save();
    return show([`${p.name} — ${W_LABEL[g]}\nتعداد مورد نظر را به عدد (بین ۱ تا ۵۰) بنویسید:`, [[btn("◀️ بازگشت", "p:" + p.id)]]]);
  }
  if (d === "s") { s.state = "search"; await save(); return show(["🔍 نام محصول (یا بخشی از آن) را بنویسید:", [[btn("🏠 صفحهٔ اول", "m")]]]); }
  if (d === "cart") { s.cart = cleanCart(prods, s.cart); await save(); return show(pgCart(s, prods)); }
  if (k === "dq" || k === "iq" || k === "del" || k === "eq") {                  // اصلاح سبد: کم/زیاد/حذف/تعداد دقیق (با شناسهٔ محصول و وزن، نه ردیف)
    s.cart = cleanCart(prods, s.cart);
    const e = s.cart.find(x => x.id === a && x.g === g);
    if (!e) { await save(); return show(pgCart(s, prods)); }
    if (k === "dq") { if (e.q > 1) e.q--; else s.cart.splice(s.cart.indexOf(e), 1); }
    else if (k === "iq") e.q = Math.min(50, e.q + 1);
    else if (k === "del") s.cart.splice(s.cart.indexOf(e), 1);
    else {
      s.state = "setqty"; s.eqid = a; s.eqg = g; await save();
      return show([`✏️ ${e.id && by[e.id] ? by[e.id].name : ""} (${W_LABEL[g]})\nتعداد فعلی: ${fa(e.q)}\n\nتعداد درست را به عدد بنویسید (۱ تا ۵۰):`, [[btn("🗑 حذف این محصول از سبد", `del:${a}:${g}`)], [btn("◀️ بازگشت به سبد", "cart")]]]);
    }
    s.state = ""; await save(); return show(pgCart(s, prods));
  }
  if (k === "rm") { s.cart = cleanCart(prods, s.cart); const i = parseInt(a); if (i >= 0 && i < s.cart.length) s.cart.splice(i, 1); await save(); return show(pgCart(s, prods)); }
  if (d === "clr") { s.cart = []; s.state = ""; await save(); return show(pgMain(s, prods)); }
  if (d === "ck") {
    s.cart = cleanCart(prods, s.cart);
    if (!s.cart.length) { s.state = ""; await save(); return show(pgMain(s, prods)); }
    s.state = "f_name"; s.form = {}; await save();
    return show(["📝 مشخصات گیرنده\n\nنام و نام خانوادگی گیرنده را بنویسید:", CANCEL]);
  }
  if (d === "nonote") { if (s.state !== "f_note") return; s.form.note = ""; return tgToReview(env, chat, s, prods, show); }
  if (d === "pay") {
    if (s.state !== "review" && s.state !== "pay_photo" && s.state !== "pay_ref") return show(pgMain(s, prods));
    const pc = priceCart(prods, s.cart); if (pc.error) return show(pgCart(s, prods));
    if (!env.PAY_INFO) return show(["فعلاً امکان ثبت سفارش از داخل بات فراهم نیست (اطلاعات پرداخت فروشگاه تنظیم نشده). لطفاً با فروشگاه تماس بگیرید.", null]);
    s.state = "pay_photo"; s.receipt = null; await save();
    return show([`💳 پرداخت\n\nمبلغ قابل پرداخت: ${fa(pc.total)} تومان\nمبلغ برای کپی (تومان): ${code(String(pc.total))}\n\n${copyable(env.PAY_INFO)}\n\n👆 با زدن روی هر عدد (مبلغ، شماره کارت، شبا) کپی می‌شود.\n\nبعد از واریز، «عکس رسید واریز» را همین‌جا ارسال کنید (عکس واضح، حداکثر ۳ مگابایت).`, CANCEL, true]);
  }
  if (d === "x") { await delSess(env, chat); return show(["سفارش لغو شد و سبد خرید پاک شد. هر زمان خواستید /order را بفرستید.", null]); }
}

function pickReceipt(msg) {
  if (Array.isArray(msg.photo) && msg.photo.length) {
    const side = (x) => Math.max(x.width || 0, x.height || 0);
    const good = msg.photo.filter(x => (x.file_size || 0) <= MAX_RECEIPT && side(x) >= MIN_SIDE).sort((x, y) => (y.width * y.height) - (x.width * x.height));
    if (good.length) return { file: { id: good[0].file_id, kind: "photo" } };
    return { error: Math.max(...msg.photo.map(side)) < MIN_SIDE ? "کیفیت عکس پایین است؛ عکس واضح‌تری از رسید بفرستید." : "حجم عکس زیاد است (حداکثر ۳ مگابایت). عکس کوچک‌تری بفرستید." };
  }
  const d = msg.document;
  if (d) {
    if (!/^image\/(jpeg|png|webp)$/.test(d.mime_type || "")) return { error: "فقط تصویر رسید پذیرفته می‌شود (JPG یا PNG)." };
    if ((d.file_size || 0) > MAX_RECEIPT) return { error: "حجم فایل زیاد است (حداکثر ۳ مگابایت)." };
    return { file: { id: d.file_id, kind: "document" } };
  }
  return { error: "لطفاً «عکس رسید واریز» را ارسال کنید (نه متن)." };
}

async function tgFinalize(env, ctx, url, chat, from, s, ref, show) {
  const pend = [], f = s.form, ip = (await sha((env.ADMIN_KEY || "") + "tg" + (from && from.id || chat))).slice(0, 20);
  const r = await placeOrder(env, { waitUntil: (p) => pend.push(p) }, url, { name: f.name, phone: f.phone, province: f.province, city: f.city, address: f.address, items: s.cart,
    note: `شناسه پرداخت: ${ref} | ثبت از تلگرام${f.note ? " | " + f.note : ""}` }, ip, "bot");
  if (r.error) return show([`❌ ${r.error}`, [[btn("🛒 مشاهدهٔ سبد", "cart")], [btn("❌ لغو سفارش", "x")]]]);
  await Promise.all(pend);                                   // اول متن سفارش برای ادمین‌ها، بعد رسید
  const cap = `💳 رسید پرداخت — سفارش ${r.code}\n👤 ${f.name} — ${f.phone}\n💰 ${fa(r.total)} تومان\n🔖 شناسه پرداخت: ${ref}` + (from && from.username ? `\nتلگرام: @${from.username}` : "");
  const isPhoto = s.receipt && s.receipt.kind === "photo";
  for (const id of tgIds(env)) {
    try { await tgApi(env, isPhoto ? "sendPhoto" : "sendDocument", { chat_id: id, [isPhoto ? "photo" : "document"]: s.receipt.id, caption: cap.slice(0, 1000) }); } catch (e) {}
  }
  await delSess(env, chat);
  return show([`✅ سفارش شما ثبت شد!\n\n🔖 کد پیگیری (با زدن روی آن کپی می‌شود):\n${code(r.code)}\n\n💰 مبلغ: ${fa(r.total)} تومان\n\nرسید پرداخت شما برای بررسی به فروشگاه ارسال شد و بعد از تأیید با شما تماس می‌گیریم.\n\nبرای دیدن وضعیت سفارش، متن زیر را با یک لمس کپی کنید و همین‌جا بفرستید:\n${code("/track " + r.code + " " + f.phone)}`, null, true]);
}

async function tgOrderText(env, ctx, url, chat, from, msg, s) {
  const prods = await orderable(env, url), show = (pg) => tgShow(env, chat, null, pg[0], pg[1], pg[2]), text = String(msg.text || "").trim(), f = s.form || (s.form = {});
  const next = async (state, prompt, rows = CANCEL) => { s.state = state; await putSess(env, chat, s); return show([prompt, rows]); };
  switch (s.state) {
    case "search": {
      const q = nrm(text);
      if (q.length < 2) return show(["حداقل ۲ حرف بنویسید:", [[btn("🏠 صفحهٔ اول", "m")]]]);
      const found = prods.filter(p => nrm(p.name).includes(q)).slice(0, 8);
      if (!found.length) return show(["موردی پیدا نشد. نام دیگری بنویسید یا از دسته‌بندی‌ها انتخاب کنید.", [[btn("🏠 صفحهٔ اول", "m")]]]);
      return show([`🔍 نتیجهٔ جستجو برای «${clip(text, 30)}»:`, found.map(p => [btn(`${p.name} — ${fa(p.price)}`, "p:" + p.id)]).concat([[btn("🏠 صفحهٔ اول", "m")]])]);
    }
    case "qty": {
      const n = Number(toEn(text)), p = prods.find(x => x.id === s.pid);
      if (!p) return tgOrderStart(env, url, chat, false);
      if (!Number.isInteger(n) || n < 1 || n > 50) return show(["عددی بین ۱ تا ۵۰ بنویسید:", [[btn("◀️ بازگشت", "p:" + p.id)]]]);
      return tgAdd(env, chat, s, prods, p, s.g, n, show);
    }
    case "setqty": {
      const e = s.cart.find(x => x.id === s.eqid && x.g === s.eqg), n = Number(toEn(text));
      if (!e) { s.state = ""; await putSess(env, chat, s); return show(pgCart(s, prods)); }
      if (!Number.isInteger(n) || n < 0 || n > 50) return show(["عددی بین ۱ تا ۵۰ بنویسید (یا ۰ برای حذف):", [[btn("🗑 حذف این محصول از سبد", `del:${e.id}:${e.g}`)], [btn("◀️ بازگشت به سبد", "cart")]]]);
      if (n === 0) s.cart.splice(s.cart.indexOf(e), 1); else e.q = n;
      s.state = ""; await putSess(env, chat, s); return show(pgCart(s, prods));
    }
    case "f_name": { const v = clip(text, 80); if (v.length < 2) return show(["نام را کامل‌تر بنویسید:", CANCEL]); f.name = v; return next("f_phone", "📞 شمارهٔ تماس گیرنده را بنویسید (مثال: 09121234567):"); }
    case "f_phone": { const v = toEn(clip(text, 20)); if (!/^09\d{9}$/.test(v)) return show(["شماره باید ۱۱ رقم و با ۰۹ شروع شود. دوباره بنویسید:", CANCEL]); f.phone = v; return next("f_province", "📍 استان را بنویسید (مثال: تهران):"); }
    case "f_province": { const v = clip(text, 40); if (v.length < 2) return show(["نام استان را بنویسید:", CANCEL]); f.province = v; return next("f_city", "🏙 شهر را بنویسید:"); }
    case "f_city": { const v = clip(text, 60); if (v.length < 2) return show(["نام شهر را بنویسید:", CANCEL]); f.city = v; return next("f_address", "🏠 آدرس کامل (خیابان، پلاک، واحد، کدپستی) را بنویسید:"); }
    case "f_address": { const v = clip(text, 400); if (v.length < 5) return show(["آدرس را کامل‌تر بنویسید:", CANCEL]); f.address = v; return next("f_note", "📝 اگر توضیحی برای سفارش دارید بنویسید، وگرنه دکمهٔ «بدون توضیح» را بزنید:", [[btn("بدون توضیح", "nonote")], [btn("❌ لغو سفارش", "x")]]); }
    case "f_note": { f.note = clip(text, 200); return tgToReview(env, chat, s, prods, show); }
    case "review": return show(["برای ادامه یکی از دکمه‌های زیر را بزنید:", [[btn("✅ تأیید و رفتن به پرداخت", "pay")], [btn("❌ لغو سفارش", "x")]]]);
    case "pay_photo": {
      const r = pickReceipt(msg);
      if (r.error) return show([r.error, CANCEL]);
      s.receipt = r.file;
      return next("pay_ref", "✅ عکس رسید دریافت شد.\n\nحالا «شناسهٔ پرداخت» (شمارهٔ پیگیری یا ارجاع واریز که روی رسید نوشته شده) را بنویسید:");
    }
    case "pay_ref": {
      const ref = toEn(clip(text, 40));
      if (ref.length < 4 || !/^[\p{L}\p{N}][\p{L}\p{N}\-_. /]*$/u.test(ref)) return show(["شناسهٔ پرداخت معتبر نیست؛ حداقل ۴ کاراکتر (حروف و عدد) بنویسید:", CANCEL]);
      if (!s.receipt) return next("pay_photo", "عکس رسید پیدا نشد؛ لطفاً دوباره عکس رسید را بفرستید:");
      return tgFinalize(env, ctx, url, chat, from, s, ref, show);
    }
  }
  return tgOrderStart(env, url, chat, false);
}

/* ---------- فهرست مخاطبین مشتری‌ها (برای ارسال تخفیف و تبلیغ) ----------
   با هر سفارش (سایت یا بات) خودکار به‌روز می‌شود و حتی اگر سفارش‌ها را حذف کنید، می‌ماند. جدول خودکار ساخته می‌شود. */
let CUST_READY = false;
async function ensureCustomers(env) {
  if (CUST_READY) return;
  const had = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'").first();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS customers (phone TEXT PRIMARY KEY, name TEXT NOT NULL, orders INTEGER NOT NULL DEFAULT 1, first_at TEXT NOT NULL DEFAULT (datetime('now')), last_at TEXT NOT NULL DEFAULT (datetime('now')), source TEXT NOT NULL DEFAULT 'site')").run();
  if (!had)                                                  // بار اول: مشتری‌های سفارش‌های موجود هم وارد فهرست می‌شوند
    await env.DB.prepare("INSERT OR IGNORE INTO customers(phone,name,orders,first_at,last_at,source) SELECT phone, (SELECT o2.name FROM shop_orders o2 WHERE o2.phone=o.phone ORDER BY o2.id DESC LIMIT 1), COUNT(*), MIN(created_at), MAX(created_at), 'site' FROM shop_orders o GROUP BY phone").run();
  CUST_READY = true;
}
async function touchCustomer(env, phone, name, source) {      // true یعنی مشتری جدید بوده
  await ensureCustomers(env);
  const known = await env.DB.prepare("SELECT 1 AS x FROM customers WHERE phone=?").bind(phone).first();
  await env.DB.prepare("INSERT INTO customers(phone,name,source) VALUES(?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name, orders=orders+1, last_at=datetime('now')").bind(phone, name, source).run();
  return !known;
}
const intl = (p) => "+98" + String(p).replace(/^0/, "");
const vEsc = (s) => String(s).replace(/[\\;,]/g, (m) => "\\" + m).replace(/[\r\n]+/g, " ");
const cEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;
function vcardOf(rows) {                                     // فایل مخاطبین استاندارد (vCard)؛ در گوشی، گوگل کانتکت و واتساپ/تلگرام وارد می‌شود
  return rows.map(r => ["BEGIN:VCARD", "VERSION:3.0", `N:${vEsc(r.name)} - نقش جهان;;;;`, `FN:${vEsc(r.name)} - نقش جهان`, `TEL;TYPE=CELL:${intl(r.phone)}`,
    `NOTE:${vEsc(`مشتری نقش جهان — ${r.orders} سفارش، آخرین: ${r.last_at}`)}`, "END:VCARD"].join("\r\n")).join("\r\n") + "\r\n";
}
const csvOf = (rows) => "\uFEFF" + ["name,phone,orders,first_order,last_order,source"].concat(rows.map(r => [cEsc(r.name), cEsc(r.phone), r.orders, cEsc(r.first_at), cEsc(r.last_at), r.source].join(","))).join("\r\n") + "\r\n";
const tgUpload = (env, method, fields, field, filename, content, mime) => {
  const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  fd.append(field, new Blob([content], { type: mime }), filename);
  return fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: "POST", body: fd });
};
async function tgContacts(env, chat) {
  await ensureCustomers(env);
  const rows = (await env.DB.prepare("SELECT phone,name,orders,first_at,last_at,source FROM customers ORDER BY last_at DESC").all()).results;
  if (!rows.length) return tgSend(env, chat, "هنوز مشتری‌ای ثبت نشده است.");
  const day = new Date().toISOString().slice(0, 10), nb = rows.filter(r => r.source === "bot").length;
  await tgSend(env, chat, `👥 فهرست مخاطبین مشتریان\n\nتعداد: ${fa(rows.length)} نفر (ثبت‌شده از سایت: ${fa(rows.length - nb)}، از بات: ${fa(nb)})\n\nفایل زیر همیشه آخرین وضعیت است و با هر مشتری جدید به‌روز می‌شود؛ هر وقت لازم شد دوباره /contacts را بفرستید.`);
  await tgUpload(env, "sendDocument", { chat_id: chat, caption: "📇 فایل مخاطبین (vCard) — در گوشی یا Google Contacts وارد کنید" }, "document", "naghshe-contacts.vcf", vcardOf(rows), "text/vcard");
  await tgUpload(env, "sendDocument", { chat_id: chat, caption: "📊 همان فهرست به‌صورت جدول (CSV) برای اکسل" }, "document", "naghshe-contacts.csv", csvOf(rows), "text/csv");
}
async function tgDelContact(env, chat, args) {
  const phone = toEn(String(args || "")).trim().split(/\s+/)[0] || "";
  if (!/^09\d{9}$/.test(phone)) return tgSend(env, chat, "شمارهٔ معتبر بفرستید، مثلاً:\n/delcontact 09121234567");
  await ensureCustomers(env);
  const r = await env.DB.prepare("DELETE FROM customers WHERE phone=?").bind(phone).run();
  return tgSend(env, chat, (r.meta && r.meta.changes) ? `✅ ${phone} از فهرست مخاطبین حذف شد.` : "این شماره در فهرست نبود.");
}

/* ---------- مدیریت مخاطبین با دکمه: /manage ----------
   هر مخاطب یک دکمه است؛ با زدن روی آن، تأیید حذف می‌آید. فیلتر «از بات» برای پاک‌کردن مخاطبین آزمایشی. */
const CPAGE = 8, CFILT = { a: "همه", b: "از بات", s: "از سایت" };
const cWhere = (f) => f === "b" ? " WHERE source='bot'" : f === "s" ? " WHERE source<>'bot'" : "";
async function tgContactList(env, chat, page, f, editId, notice) {
  await ensureCustomers(env);
  f = CFILT[f] ? f : "a";
  const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM customers" + cWhere(f)).first()).n;
  const pages = Math.max(1, Math.ceil(total / CPAGE)); page = Math.min(Math.max(0, Number(page) || 0), pages - 1);
  const rows = (await env.DB.prepare("SELECT phone,name,orders,source FROM customers" + cWhere(f) + " ORDER BY last_at DESC, phone LIMIT ? OFFSET ?").bind(CPAGE, page * CPAGE).all()).results;
  const kb = rows.map(r => [{ text: `🗑 ${String(r.name).slice(0, 16)} • ${r.phone}${r.source === "bot" ? " 🤖" : ""}`, callback_data: `cd:${r.phone}:${page}:${f}` }]);
  const nav = [];
  if (page > 0) nav.push({ text: "◀️ قبلی", callback_data: `cl:${page - 1}:${f}` });
  if (page < pages - 1) nav.push({ text: "بعدی ▶️", callback_data: `cl:${page + 1}:${f}` });
  if (nav.length) kb.push(nav);
  kb.push(Object.keys(CFILT).map(k => ({ text: (k === f ? "🔘 " : "") + CFILT[k], callback_data: `cl:0:${k}` })));
  kb.push([{ text: "📇 دریافت فایل مخاطبین", callback_data: "cf" }]);
  const text = (notice ? notice + "\n\n" : "") + (total ? `👥 مدیریت مخاطبین (${CFILT[f]})\n\nتعداد: ${fa(total)} نفر — صفحه ${fa(page + 1)} از ${fa(pages)}\nروی هر مخاطب بزنید تا حذفش کنید. (🤖 یعنی ثبت‌شده از بات)` : `هیچ مخاطبی در این فهرست نیست.`);
  const markup = { inline_keyboard: kb };
  if (editId) { const r = await tgApi(env, "editMessageText", { chat_id: chat, message_id: editId, text, reply_markup: markup }); if (r.ok) return; }
  return tgSend(env, chat, text, markup);
}
async function tgContactCb(env, chat, msgId, cmd) {
  const [op, a, b, c] = cmd.split(":");
  if (op === "cl") return tgContactList(env, chat, b === undefined ? 0 : a, b === undefined ? "a" : b, msgId);
  const phone = /^09\d{9}$/.test(a || "") ? a : "", page = Number(b) || 0, f = CFILT[c] ? c : "a";
  if (!phone) return tgContactList(env, chat, 0, "a", msgId);
  await ensureCustomers(env);
  const row = await env.DB.prepare("SELECT name,orders FROM customers WHERE phone=?").bind(phone).first();
  if (!row) return tgContactList(env, chat, page, f, msgId, "این مخاطب قبلاً حذف شده بود.");
  if (op === "cd") {
    const text = `❓ این مخاطب از فهرست حذف شود؟\n\n👤 ${row.name}\n📞 ${phone}\n🧾 ${fa(row.orders)} سفارش\n\n(سفارش‌های ثبت‌شده حذف نمی‌شوند؛ فقط از فهرست مخاطبین پاک می‌شود.)`;
    const markup = { inline_keyboard: [[{ text: "✅ بله، حذف شود", callback_data: `cy:${phone}:${page}:${f}` }], [{ text: "↩️ انصراف", callback_data: `cl:${page}:${f}` }]] };
    const r = await tgApi(env, "editMessageText", { chat_id: chat, message_id: msgId, text, reply_markup: markup });
    if (!r.ok) await tgSend(env, chat, text, markup);
    return;
  }
  await env.DB.prepare("DELETE FROM customers WHERE phone=?").bind(phone).run();
  return tgContactList(env, chat, page, f, msgId, `✅ ${row.name} (${phone}) حذف شد.`);
}

async function telegramHook(req, env, url, ctx) {
  if (!env.TG_BOT_TOKEN || !env.ADMIN_KEY) return J({ ok: false }, 503);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== await tgSecret(env)) return J({ ok: false }, 401);
  const u = await readJson(req, 100000);
  if (!u || typeof u !== "object") return J({ ok: true });
  try {                                                  // همیشه ۲۰۰ برمی‌گردانیم تا تلگرام یک پیام را بارها دوباره نفرستد
    const cb = u.callback_query, msg = cb ? cb.message : u.message, from = cb ? cb.from : (u.message && u.message.from);
    if (!msg || !msg.chat) return J({ ok: true });
    let cmd = "", args = "";
    if (cb) { cmd = String(cb.data || ""); await tgApi(env, "answerCallbackQuery", { callback_query_id: cb.id }); }
    else { const m = String(msg.text || "").trim().match(/^\/([a-zA-Z_][a-zA-Z0-9_-]*)(?:@\w+)?(?:\s+([\s\S]*))?$/); if (m) { cmd = m[1].toLowerCase().replace(/-/g, "_"); args = m[2] || ""; } else args = String(msg.text || ""); }
    const chat = msg.chat.id, priv = msg.chat.type === "private", ok = tgAllowed(env, msg.chat, from);
    /* ---- ثبت سفارش در بات: فقط چت خصوصی، برای همه ---- */
    if (cb && /^(m|s|cart|clr|ck|pay|x|nonote)$|^(c|p|w|q|qx|rm|dq|iq|eq|del):/.test(cmd)) { if (priv) await tgOrderCb(env, ctx, url, chat, from, msg.message_id, cmd); return J({ ok: true }); }
    if (cb && !ok) return J({ ok: true });                // دکمه‌های مدیریتی فقط برای مدیر هستند
    if (!cmd && !priv) return J({ ok: true });             // در گروه‌ها فقط به دستورها جواب می‌دهیم، نه به گفتگوی عادی
    if (cmd === "order" || cmd === "shop" || cmd === "cart" || cmd === "cancel") {
      if (!priv) { await tgSend(env, chat, "ثبت سفارش فقط در چت خصوصی با بات انجام می‌شود. روی نام بات بزنید و /order را بفرستید."); return J({ ok: true }); }
      if (cmd === "cancel") { await delSess(env, chat); await tgSend(env, chat, "لغو شد و سبد خرید پاک شد. برای شروع دوباره /order را بفرستید."); }
      else await tgOrderStart(env, url, chat, cmd === "cart");
      return J({ ok: true });
    }
    if (!cmd && priv) { const s = await getSess(env, chat); if (s.state) { await tgOrderText(env, ctx, url, chat, from, msg, s); return J({ ok: true }); } }

    /* ---- پیگیری سفارش: برای همه، فقط با کد سفارش + شمارهٔ همان سفارش ---- */
    const wantsTrack = cmd === "track" || (!ok && cmd === "catalog" && args.trim()) || (!cmd && priv && /\d{6}/.test(toEn(args)) && /09\d{9}/.test(toEn(args)));
    if (wantsTrack || (ok && cmd === "catalog" && args.trim())) {
      if (!ok && !priv) { await tgSend(env, chat, "برای حفظ حریم خصوصی، پیگیری سفارش را در چت خصوصی با بات انجام دهید."); return J({ ok: true }); }
      await tgSend(env, chat, await tgTrackText(env, from, args));
      return J({ ok: true });
    }

    if (cmd === "start" || cmd === "help") {
      if (!ok) {
        await tgSend(env, chat, TG_CUSTOMER_HELP + (tgIds(env).length ? "" : "\n\n— اگر شما مدیر هستید: شناسهٔ این چت " + chat + " است؛ آن را در تنظیمات Worker به‌عنوان TG_CHAT_ID (Secret) ثبت کنید."), undefined, true);
        return J({ ok: true });
      }
      const viaName = !tgIds(env).includes(String(msg.chat.id));
      await tgSend(env, chat, TG_HELP + (viaName ? `\n\n🔐 پیشنهاد امنیتی: شناسهٔ عددی این چت (${chat}) را جای یوزرنیم در TG_CHAT_ID بگذارید.` : ""), TG_MENU);
      return J({ ok: true });
    }
    if (!ok) { if (priv) await tgSend(env, chat, TG_CUSTOMER_HELP, undefined, true); return J({ ok: true }); }   // بقیهٔ دستورها فقط برای مدیر/گروه مدیریت
    if (cmd === "products") await tgSend(env, chat, await tgProductsText(env, url), TG_MENU);
    else if (cmd === "catalog" || cmd === "orders") await tgSend(env, chat, await tgCatalogText(env), TG_MENU);
    else if (cmd === "contacts" || cmd === "contact" || cmd === "contact_info" || cmd === "contactinfo") await tgContacts(env, chat);   // «/contact-info» هم کار می‌کند (تلگرام خط‌تیره را جزو دستور نمی‌داند)
    else if (cmd === "delcontact") await tgDelContact(env, chat, args);
    else if (cmd === "manage" || cmd === "managecontacts" || cmd === "contactlist") await tgContactList(env, chat, 0, "a");
    else if (cmd === "cf") await tgContacts(env, chat);
    else if (/^(cl|cd|cy)(:|$)/.test(cmd)) await tgContactCb(env, chat, msg.message_id, cmd);
    else await tgSend(env, chat, "دستور شناخته نشد. برای دیدن دستورها /start را بفرستید.", TG_MENU);
  } catch (e) { console.error("telegram hook", e && e.message); }
  return J({ ok: true });
}

/* ---------- ورودی اصلی ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname;
    try {
      if (p === "/products.json" && req.method === "GET")
        return await cachedJson(ctx, url, "products.json", 60, async () => JSON.stringify(applyOverrides(await loadProducts(env, url), false)));
      if (p === "/reviews.json" && req.method === "GET")
        return await cachedJson(ctx, url, "reviews.json", 180, async () => JSON.stringify(await allReviews(env, url)));
      if (p.startsWith("/api/")) {
        if (!env.DB) return bad("دیتابیس به پروژه وصل نیست (Settings > Bindings > D1 با نام DB).", 503);
        const origin = req.headers.get("origin");
        if (req.method === "POST" && origin) {
          const allowedOrigins = String(env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
          let sameOrigin = false;
          try { sameOrigin = new URL(origin).host === url.host; } catch (e) {}
          if (!sameOrigin && !allowedOrigins.includes(origin)) return bad("درخواست غیرمجاز.", 403);
        }
        if (p === "/api/order" && req.method === "POST") return await createOrder(req, env, ctx, url);
        if (p === "/api/review" && req.method === "POST") return await createReview(req, env, url);
        if (p === "/api/track" && req.method === "POST") return await trackOrder(req, env);
        if (p === "/api/telegram" && req.method === "POST") return await telegramHook(req, env, url, ctx);
        if (p.startsWith("/api/admin/")) return await admin(req, env, url, p.slice(11));
        return bad("مسیر پیدا نشد.", 404);
      }
    } catch (e) {
      return bad("خطای سرور. چند لحظه بعد دوباره تلاش کنید.", 500);
    }
    return env.ASSETS.fetch(req);
  }
};
