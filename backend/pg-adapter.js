const TABLE_EXISTS_SQL = /SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*'table'\s+AND\s+name\s*=\s*'customers'/i;

/** Translate the small D1/SQLite query subset used by worker.js to PostgreSQL. */
export function translateSql(source, params = []) {
  if (TABLE_EXISTS_SQL.test(source)) {
    return {
      sql: "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = 'customers'",
      params: [],
    };
  }

  const ignoreConflicts = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(source);
  let sql = source.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT INTO");
  sql = sql
    .replace(/datetime\(\s*'now'\s*\)/gi, "(NOW() AT TIME ZONE 'UTC')")
    .replace(/\bapproved\s*=\s*1\b/gi, "approved = TRUE")
    .replace(/\bapproved\s*=\s*0\b/gi, "approved = FALSE");

  const values = [];
  let output = "";
  let quote = null;
  let parameterIndex = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      output += ch;
      if (ch === quote && sql[i + 1] === quote) {
        output += sql[++i];
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      output += ch;
      continue;
    }
    if (ch === "?") {
      const index = parameterIndex++;
      const isApproved = /\bapproved\s*=\s*$/i.test(output);
      output += `$${index + 1}${isApproved ? "::boolean" : ""}`;
      const value = params[index];
      values.push(isApproved && value != null ? Boolean(Number(value)) : value === undefined ? null : value);
      continue;
    }
    output += ch;
  }
  if (parameterIndex !== params.length) {
    throw new Error(`SQL parameter count mismatch: expected ${parameterIndex}, received ${params.length}`);
  }
  if (ignoreConflicts) output = output.replace(/;\s*$/, "") + " ON CONFLICT DO NOTHING";
  return { sql: output, params: values };
}

function normalizeRow(row) {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value instanceof Date ? value.toISOString().slice(0, 19).replace("T", " ") : value,
  ]));
}

export function createD1Compat(pool) {
  return {
    prepare(source) {
      let params = [];
      const statement = {
        bind(...values) {
          params = values;
          return statement;
        },
        async first() {
          const translated = translateSql(source, params);
          const result = await pool.query(translated.sql, translated.params);
          return normalizeRow(result.rows[0] || null);
        },
        async all() {
          const translated = translateSql(source, params);
          const result = await pool.query(translated.sql, translated.params);
          return { results: result.rows.map(normalizeRow), success: true };
        },
        async run() {
          const translated = translateSql(source, params);
          const result = await pool.query(translated.sql, translated.params);
          return { success: true, meta: { changes: result.rowCount || 0 } };
        },
      };
      return statement;
    },
  };
}
