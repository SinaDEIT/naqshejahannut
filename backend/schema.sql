-- ساختار دیتابیس فروشگاه نقش جهان (Cloudflare D1)
-- این فایل را یک‌بار در D1 > Console اجرا کنید. اجرای دوباره بی‌خطر است و داده‌ها را پاک نمی‌کند.

CREATE TABLE IF NOT EXISTS shop_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT,
  city TEXT,
  address TEXT NOT NULL,
  note TEXT,
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON shop_orders(created_at);

CREATE TABLE IF NOT EXISTS shop_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pid TEXT,
  name TEXT,
  rating INTEGER NOT NULL,
  body TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_overrides (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_hits (
  k TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hits ON rate_hits(k, ts);

-- وضعیت گفتگوی ثبت سفارش در بات تلگرام (اگر اجرا نکنید، بات خودش می‌سازد)
CREATE TABLE IF NOT EXISTS tg_sessions (
  chat TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '{}',
  updated INTEGER NOT NULL
);

-- جدول customers (فهرست مخاطبین مشتری‌ها) را بات/سایت خودکار می‌سازد و مشتری‌های سفارش‌های قبلی را هم وارد می‌کند؛ اینجا اجرایش نکنید.
