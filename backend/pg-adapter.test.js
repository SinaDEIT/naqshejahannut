import test from "node:test";
import assert from "node:assert/strict";
import { createD1Compat, translateSql } from "./pg-adapter.js";

test("translates bound values to PostgreSQL placeholders", () => {
  const translated = translateSql("SELECT * FROM shop_orders WHERE code=? AND phone=?", ["NJ-123456", "09121234567"]);
  assert.equal(translated.sql, "SELECT * FROM shop_orders WHERE code=$1 AND phone=$2");
  assert.deepEqual(translated.params, ["NJ-123456", "09121234567"]);
});

test("maps integer approval filter to a PostgreSQL boolean", () => {
  const translated = translateSql("SELECT id FROM shop_reviews WHERE approved=? ORDER BY id DESC", [1]);
  assert.equal(translated.sql, "SELECT id FROM shop_reviews WHERE approved=$1::boolean ORDER BY id DESC");
  assert.deepEqual(translated.params, [true]);
  assert.equal(translateSql("UPDATE shop_reviews SET approved=1 WHERE id=?", [4]).sql, "UPDATE shop_reviews SET approved = TRUE WHERE id=$1");
});

test("maps SQLite-only customer discovery and datetime syntax", () => {
  const existence = translateSql("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'");
  assert.match(existence.sql, /information_schema\.tables/);
  assert.deepEqual(existence.params, []);
  assert.equal(translateSql("UPDATE customers SET last_at=datetime('now') WHERE phone=?", ["09121234567"]).sql,
    "UPDATE customers SET last_at=(NOW() AT TIME ZONE 'UTC') WHERE phone=$1");
});

test("maps INSERT OR IGNORE and D1 result shapes", async () => {
  const translated = translateSql("INSERT OR IGNORE INTO customers(phone,name) SELECT phone,name FROM shop_orders", []);
  assert.equal(translated.sql, "INSERT INTO customers(phone,name) SELECT phone,name FROM shop_orders ON CONFLICT DO NOTHING");

  const calls = [];
  const compat = createD1Compat({
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT")) return { rows: [{ n: "2" }, { n: "3" }], rowCount: 2 };
      return { rows: [], rowCount: 4 };
    },
  });
  assert.deepEqual(await compat.prepare("SELECT COUNT(*) AS n FROM rate_hits WHERE k=?").bind("o:key").first(), { n: "2" });
  assert.deepEqual((await compat.prepare("SELECT n FROM x").all()).results, [{ n: "2" }, { n: "3" }]);
  assert.equal((await compat.prepare("DELETE FROM x WHERE id=?").bind(1).run()).meta.changes, 4);
  assert.equal(calls.length, 3);
});

test("rejects a mismatched SQL parameter count", () => {
  assert.throws(() => translateSql("SELECT * FROM x WHERE id=?", []), /parameter count mismatch/);
});
