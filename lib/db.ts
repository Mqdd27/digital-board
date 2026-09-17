import "server-only";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ponytail: SQLite is the right default for a self-hosted single-instance app.
// Moving to Postgres means replacing this module and keeping lib/schema.sql —
// every query already lives in lib/queries.ts and lib/actions.ts.
const FILE = process.env.DATABASE_PATH ?? join(process.cwd(), "db", "board.sqlite");

/** Uploaded files live beside the database so one volume holds all the state. */
export const UPLOAD_DIR = join(dirname(FILE), "uploads");

declare global {
  var __boardDb: Database.Database | undefined;
}

function open() {
  mkdirSync(dirname(FILE), { recursive: true });
  const conn = new Database(FILE);
  // Build workers and dev hot-reloads can touch the file at the same moment.
  conn.pragma("busy_timeout = 5000");
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.exec(readFileSync(join(process.cwd(), "lib", "schema.sql"), "utf8"));
  migrate(conn);
  return conn;
}

/**
 * `CREATE TABLE IF NOT EXISTS` covers new tables but not new columns on an
 * existing one, so added columns are applied here. Keep entries append-only —
 * an installed database may be at any earlier point in this list.
 */
function migrate(conn: Database.Database) {
  const added: [table: string, column: string, ddl: string][] = [
    ["users", "last_seen_at", "ALTER TABLE users ADD COLUMN last_seen_at TEXT"],
    ["messages", "edited_at", "ALTER TABLE messages ADD COLUMN edited_at TEXT"],
  ];
  for (const [table, column, ddl] of added) {
    const cols = conn.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) conn.exec(ddl);
  }
}

/**
 * Opened on first query, never at import. Importing this module during
 * `next build` must not create a database file or contend on WAL setup.
 */
export function getDb() {
  return (globalThis.__boardDb ??= open());
}

/** True once the first account exists — the setup-wizard gate. */
export function isInstalled() {
  return get("SELECT 1 FROM users LIMIT 1") !== undefined;
}

// Thin typed wrappers. better-sqlite3's own generics are awkward; these keep
// call sites readable and are the only place a cast lives.
type Args = unknown[];
export const get = <T>(sql: string, ...args: Args) => getDb().prepare(sql).get(...(args as never[])) as T | undefined;
export const all = <T>(sql: string, ...args: Args) => getDb().prepare(sql).all(...(args as never[])) as T[];
export const run = (sql: string, ...args: Args) => getDb().prepare(sql).run(...(args as never[]));
export const transaction = (fn: () => void) => getDb().transaction(fn)();
