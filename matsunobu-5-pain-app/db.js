const fs   = require('fs');
const path = require('path');

let sql = null;

function isNeon() {
  return !!process.env.DATABASE_URL;
}

function getSql() {
  if (!sql) {
    const { neon } = require('@neondatabase/serverless');
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

async function initDb() {
  if (!isNeon()) return;
  const db = getSql();
  await db`
    CREATE TABLE IF NOT EXISTS kv_store (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `;
}

async function read(table) {
  if (isNeon()) {
    const db = getSql();
    const rows = await db`SELECT value FROM kv_store WHERE key = ${table}`;
    return rows.length > 0 ? rows[0].value : [];
  }
  const DATA_DIR = path.join(__dirname, 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const file = path.join(DATA_DIR, `${table}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

async function write(table, data) {
  if (isNeon()) {
    const db = getSql();
    const json = JSON.stringify(data);
    await db`
      INSERT INTO kv_store (key, value) VALUES (${table}, ${json}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${json}::jsonb
    `;
    return;
  }
  const DATA_DIR = path.join(__dirname, 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const file = path.join(DATA_DIR, `${table}.json`);
  const tmp  = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

module.exports = { read, write, initDb };
