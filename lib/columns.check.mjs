// Run: node lib/columns.check.mjs
import assert from "node:assert/strict";
import D from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

const db = new D(":memory:");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync("lib/schema.sql", "utf8").replace(/PRAGMA[^;]*;/g, ""));

const pid = randomUUID();
db.prepare("INSERT INTO projects (id,name,position,created_at) VALUES (?,?,0,?)").run(pid, "P", "t");

const add = (title, color) => {
  const n = db.prepare("SELECT COALESCE(MAX(position)+1,0) n FROM columns WHERE project_id=?").get(pid).n;
  const id = randomUUID();
  db.prepare("INSERT INTO columns (id,project_id,title,color,position) VALUES (?,?,?,?,?)").run(id, pid, title, color, n);
  return id;
};
const order = () => db.prepare("SELECT title FROM columns WHERE project_id=? ORDER BY position").all(pid).map(r => r.title);

// addColumn appends
const a = add("Backlog", "c1"), b = add("Doing", "c2"), c = add("Done", "c3");
assert.deepEqual(order(), ["Backlog", "Doing", "Done"], "appended in order");

// moveColumn — the exact splice from lib/actions.ts
function moveColumn(id, direction) {
  const col = db.prepare("SELECT project_id, position FROM columns WHERE id=?").get(id);
  if (!col) return;
  const ordered = db.prepare("SELECT id FROM columns WHERE project_id=? ORDER BY position").all(col.project_id).map(r => r.id);
  const from = ordered.indexOf(id);
  const to = from + direction;
  if (to < 0 || to >= ordered.length) return;
  ordered.splice(to, 0, ...ordered.splice(from, 1));
  ordered.forEach((cid, i) => db.prepare("UPDATE columns SET position=? WHERE id=?").run(i, cid));
}

moveColumn(c, -1);
assert.deepEqual(order(), ["Backlog", "Done", "Doing"], "moved left");
moveColumn(c, 1);
assert.deepEqual(order(), ["Backlog", "Doing", "Done"], "moved back right");
moveColumn(a, -1);
assert.deepEqual(order(), ["Backlog", "Doing", "Done"], "left edge is a no-op");
moveColumn(c, 1);
assert.deepEqual(order(), ["Backlog", "Doing", "Done"], "right edge is a no-op");

// positions stay dense after a move
const pos = db.prepare("SELECT position FROM columns WHERE project_id=? ORDER BY position").all(pid).map(r => r.position);
assert.deepEqual(pos, [0, 1, 2], "positions dense");

// updateColumn
db.prepare("UPDATE columns SET title=?, color=? WHERE id=?").run("In Review", "c9", b);
assert.deepEqual(order(), ["Backlog", "In Review", "Done"], "renamed in place");

// deleting a column cascades its tasks
const tid = randomUUID();
db.prepare("INSERT INTO tasks (id,column_id,title,priority,position,created_at) VALUES (?,?,?,?,0,?)").run(tid, b, "T", "low", "t");
db.prepare("INSERT INTO task_events (task_id,text,at) VALUES (?,?,?)").run(tid, "created", "t");
db.prepare("DELETE FROM columns WHERE id=?").run(b);
assert.equal(db.prepare("SELECT COUNT(*) n FROM tasks WHERE id=?").get(tid).n, 0, "tasks cascade");
assert.equal(db.prepare("SELECT COUNT(*) n FROM task_events WHERE task_id=?").get(tid).n, 0, "events cascade");

// last-column guard
const left = () => db.prepare("SELECT COUNT(*) n FROM columns WHERE project_id=?").get(pid).n;
assert.equal(left(), 2);
db.prepare("DELETE FROM columns WHERE id=?").run(c);
assert.equal(left(), 1, "one column left");
assert.ok(left() <= 1, "guard would now refuse the last delete");

console.log("columns.check ok");

// ── project cascade: deleting a project must take everything under it ───────
{
  const db2 = new D(":memory:");
  db2.pragma("foreign_keys = ON");
  db2.exec(fs.readFileSync("lib/schema.sql", "utf8").replace(/PRAGMA[^;]*;/g, ""));

  const proj = randomUUID(), col = randomUUID(), task = randomUUID(), cv = randomUUID(), usr = randomUUID();
  db2.prepare("INSERT INTO users (id,email,name,password_hash,color,is_admin,created_at) VALUES (?,?,?,?,?,0,?)")
    .run(usr, "u@e", "U", "h", "c", "t");
  db2.prepare("INSERT INTO projects (id,name,position,created_at) VALUES (?,?,0,?)").run(proj, "P", "t");
  db2.prepare("INSERT INTO columns (id,project_id,title,color,position) VALUES (?,?,?,?,0)").run(col, proj, "C", "c");
  db2.prepare("INSERT INTO tasks (id,column_id,title,priority,position,created_at) VALUES (?,?,?,?,0,?)").run(task, col, "T", "low", "t");
  db2.prepare("INSERT INTO task_events (task_id,actor_id,text,at) VALUES (?,?,?,?)").run(task, usr, "created", "t");
  db2.prepare("INSERT INTO canvases (id,project_id,name,position,snapshot,updated_at) VALUES (?,?,?,0,?,?)").run(cv, proj, "S", "{}", "t");

  db2.prepare("DELETE FROM projects WHERE id=?").run(proj);
  const count = (t, c, v) => db2.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${c}=?`).get(v).n;
  assert.equal(count("columns", "id", col), 0, "columns cascade");
  assert.equal(count("tasks", "id", task), 0, "tasks cascade");
  assert.equal(count("task_events", "task_id", task), 0, "task_events cascade");
  assert.equal(count("canvases", "id", cv), 0, "canvases cascade");
  assert.equal(count("users", "id", usr), 1, "users survive a project delete");

  // messages: a DM disappears with either participant, the channel survives
  const u2 = randomUUID();
  db2.prepare("INSERT INTO users (id,email,name,password_hash,color,is_admin,created_at) VALUES (?,?,?,?,?,0,?)")
    .run(u2, "v@e", "V", "h", "c", "t");
  db2.prepare("INSERT INTO messages (author_id,recipient_id,body,created_at) VALUES (?,?,?,?)").run(usr, u2, "dm", "t");
  db2.prepare("INSERT INTO messages (author_id,recipient_id,body,created_at) VALUES (?,NULL,?,?)").run(usr, "channel", "t");
  assert.equal(db2.prepare("SELECT COUNT(*) n FROM messages").get().n, 2);
  db2.prepare("DELETE FROM users WHERE id=?").run(u2);
  assert.equal(db2.prepare("SELECT COUNT(*) n FROM messages").get().n, 1, "DM removed with the recipient");
  assert.equal(db2.prepare("SELECT recipient_id FROM messages").get().recipient_id, null, "channel message survives");
}

console.log("project/message cascade ok");
