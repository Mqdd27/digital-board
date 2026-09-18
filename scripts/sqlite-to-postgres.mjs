/**
 * One-shot copy of an existing SQLite database into Postgres.
 *
 *   DATABASE_URL=postgres://user:pass@host/db \
 *   node scripts/sqlite-to-postgres.mjs ./db/board.sqlite
 *
 * Reads only. The SQLite file is never modified, so it stays a working
 * rollback: point the old build at it and you are back where you started.
 *
 * Refuses to touch a Postgres database that already has accounts unless
 * --force is passed, so a second accidental run cannot double-insert.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const [, , sqlitePath = "./db/board.sqlite", ...flags] = process.argv;
const force = flags.includes("--force");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (!existsSync(sqlitePath)) {
  console.error(`No SQLite database at ${sqlitePath}`);
  process.exit(1);
}

// Parent before child: every FK must already have its target row.
const TABLES = [
  ["users", ["id", "email", "name", "password_hash", "color", "is_admin", "created_at", "last_seen_at"]],
  ["settings", ["key", "value"]],
  ["projects", ["id", "name", "position", "created_at"]],
  ["columns", ["id", "project_id", "title", "color", "position"]],
  ["tasks", ["id", "column_id", "title", "label", "priority", "assignee_id", "due_date", "position", "created_at"]],
  ["task_events", ["id", "task_id", "actor_id", "text", "at"]],
  ["canvases", ["id", "project_id", "name", "position", "snapshot", "updated_at"]],
  ["messages", ["id", "author_id", "recipient_id", "body", "created_at", "edited_at"]],
  ["message_reads", ["user_id", "channel", "last_read_id"]],
  ["attachments", ["id", "message_id", "name", "mime", "size", "created_at"]],
  // sessions are deliberately skipped — everyone signs in again, which is
  // cheaper than carrying stale tokens across.
];

// Identity columns we insert explicitly; their sequences must be moved past the
// highest id afterwards or the next insert collides with a migrated row.
const IDENTITY = [["task_events", "id"], ["messages", "id"]];

const sqlite = new Database(sqlitePath, { readonly: true });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sqliteColumns = (table) =>
  new Set(sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));

try {
  console.log(`Source : ${sqlitePath}`);
  console.log(`Target : ${process.env.DATABASE_URL.replace(/:[^:@/]*@/, ":***@")}\n`);

  await client.query(readFileSync(join(process.cwd(), "lib", "schema.sql"), "utf8"));

  const { rows: existing } = await client.query("SELECT COUNT(*)::int n FROM users");
  if (existing[0].n > 0 && !force) {
    console.error(`Target already has ${existing[0].n} account(s). Refusing to import on top of it.`);
    console.error("Re-run with --force only if you mean to add to it.");
    process.exit(1);
  }

  await client.query("BEGIN");
  const counts = {};

  for (const [table, allColumns] of TABLES) {
    // An older SQLite file may predate a column; copy what is actually there.
    const present = sqliteColumns(table);
    const cols = allColumns.filter((c) => present.has(c));
    if (cols.length === 0) {
      console.log(`${table.padEnd(14)} skipped (table missing in source)`);
      continue;
    }

    const rows = sqlite.prepare(`SELECT ${cols.join(", ")} FROM ${table}`).all();
    for (const row of rows) {
      await client.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})
         ON CONFLICT DO NOTHING`,
        cols.map((c) => row[c]),
      );
    }
    counts[table] = rows.length;
    console.log(`${table.padEnd(14)} ${String(rows.length).padStart(6)} rows`);
  }

  for (const [table, col] of IDENTITY) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${table}', '${col}'),
                     COALESCE((SELECT MAX(${col}) FROM ${table}), 0) + 1, false)`,
    );
  }

  await client.query("COMMIT");

  // Verify before declaring success: every source row must have landed.
  for (const [table] of TABLES) {
    if (counts[table] === undefined) continue;
    const { rows } = await client.query(`SELECT COUNT(*)::int n FROM ${table}`);
    assert.equal(rows[0].n, counts[table], `${table}: ${rows[0].n} in Postgres, ${counts[table]} in SQLite`);
  }
  console.log("\nRow counts match.");

  // Attachments are files on disk, not database rows.
  const from = join(dirname(sqlitePath), "uploads");
  const to = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
  if (existsSync(from) && from !== to) {
    cpSync(from, to, { recursive: true });
    console.log(`Copied attachments: ${from} -> ${to}`);
  }

  console.log("\nDone. The SQLite file was not modified — keep it until you are happy.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("\nImport failed, nothing was committed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
  sqlite.close();
}
