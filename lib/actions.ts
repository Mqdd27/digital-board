"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, get, isInstalled, run, transaction } from "./db";
import { createUser, currentUser, endSession, login, startSession } from "./auth";
import { DEFAULT_COLUMNS, type Priority } from "./board";

async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

const now = () => new Date().toISOString();

function logEvent(taskId: string, actorId: string | null, text: string) {
  run("INSERT INTO task_events (task_id, actor_id, text, at) VALUES (?,?,?,?)", taskId, actorId, text, now());
}

// ── Setup wizard ────────────────────────────────────────────────────────────

export async function runSetup(_prev: unknown, form: FormData) {
  if (isInstalled()) redirect("/login");

  const workspace = String(form.get("workspace") ?? "").trim();
  const project = String(form.get("project") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const columns = form.getAll("columns").map(String).filter(Boolean);

  if (!workspace || !project || !name || !email || !password) return { error: "All fields are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address isn't valid." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (columns.length === 0) return { error: "Pick at least one column." };

  const userId = createUser(email, name, password, true);
  run("INSERT INTO settings (key, value) VALUES ('workspace', ?)", workspace);

  const projectId = randomUUID();
  run("INSERT INTO projects (id, name, position, created_at) VALUES (?,?,0,?)", projectId, project, now());
  columns.forEach((title, i) => {
    const preset = DEFAULT_COLUMNS.find((d) => d.title === title);
    run(
      "INSERT INTO columns (id, project_id, title, color, position) VALUES (?,?,?,?,?)",
      randomUUID(),
      projectId,
      title,
      preset?.color ?? "var(--muted-foreground)",
      i,
    );
  });

  await startSession(userId);
  redirect("/board");
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function loginAction(_prev: unknown, form: FormData) {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const id = login(email, password);
  if (!id) return { error: "Wrong email or password." };
  await startSession(id);
  redirect("/board");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

export async function inviteMember(_prev: unknown, form: FormData) {
  const user = await requireUser();
  if (!user.is_admin) return { error: "Only admins can add members." };

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name || !email || password.length < 8) return { error: "Name, email and a password of at least 8 characters are required." };
  if (get("SELECT 1 FROM users WHERE email = ?", email.toLowerCase())) return { error: "That email is already registered." };

  createUser(email, name, password);
  revalidatePath("/board");
  return { ok: true };
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function createTask(_prev: unknown, form: FormData) {
  const user = await requireUser();
  const columnId = String(form.get("columnId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  if (!get("SELECT 1 FROM columns WHERE id = ?", columnId)) return { error: "Column not found." };

  const priority = (String(form.get("priority") ?? "medium") as Priority) ?? "medium";
  const label = String(form.get("label") ?? "").trim() || null;
  const dueDate = String(form.get("dueDate") ?? "").trim() || null;
  const assignee = String(form.get("assigneeId") ?? "").trim() || null;

  const next = get<{ n: number }>("SELECT COALESCE(MAX(position) + 1, 0) n FROM tasks WHERE column_id = ?", columnId)!.n;
  const id = randomUUID();
  run(
    `INSERT INTO tasks (id, column_id, title, label, priority, assignee_id, due_date, position, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, columnId, title, label, priority, assignee, dueDate, next, now(),
  );
  logEvent(id, user.id, "Task created");
  revalidatePath("/board");
  return { ok: true };
}

/** Move or reorder. Renumbers both affected columns so positions stay dense. */
export async function moveTask(taskId: string, toColumnId: string, toIndex: number) {
  const user = await requireUser();
  const task = get<{ column_id: string; title: string }>("SELECT column_id, title FROM tasks WHERE id = ?", taskId);
  const dest = get<{ title: string }>("SELECT title FROM columns WHERE id = ?", toColumnId);
  if (!task || !dest) return;

  const fromColumnId = task.column_id;
  const fromTitle = get<{ title: string }>("SELECT title FROM columns WHERE id = ?", fromColumnId)?.title ?? "?";

  transaction(() => {
    const siblings = all<{ id: string }>(
      "SELECT id FROM tasks WHERE column_id = ? AND id != ? ORDER BY position",
      toColumnId,
      taskId,
    ).map((r) => r.id);
    siblings.splice(Math.max(0, Math.min(toIndex, siblings.length)), 0, taskId);

    run("UPDATE tasks SET column_id = ? WHERE id = ?", toColumnId, taskId);
    siblings.forEach((id, i) => run("UPDATE tasks SET position = ? WHERE id = ?", i, id));

    if (fromColumnId !== toColumnId) {
      all<{ id: string }>("SELECT id FROM tasks WHERE column_id = ? ORDER BY position", fromColumnId).forEach((r, i) =>
        run("UPDATE tasks SET position = ? WHERE id = ?", i, r.id),
      );
    }

    logEvent(
      taskId,
      user.id,
      fromColumnId === toColumnId ? `Reordered in ${dest.title}` : `Moved from ${fromTitle} to ${dest.title}`,
    );
  });

  revalidatePath("/board");
}

export async function updateTask(_prev: unknown, form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const before = get<{ title: string; priority: string; assignee_id: string | null; due_date: string | null }>(
    "SELECT title, priority, assignee_id, due_date FROM tasks WHERE id = ?",
    id,
  );
  if (!before) return { error: "Task not found." };

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  const priority = String(form.get("priority") ?? before.priority);
  const label = String(form.get("label") ?? "").trim() || null;
  const dueDate = String(form.get("dueDate") ?? "").trim() || null;
  const assignee = String(form.get("assigneeId") ?? "").trim() || null;

  run(
    "UPDATE tasks SET title = ?, label = ?, priority = ?, assignee_id = ?, due_date = ? WHERE id = ?",
    title, label, priority, assignee, dueDate, id,
  );

  if (before.title !== title) logEvent(id, user.id, `Title changed to "${title}"`);
  if (before.priority !== priority) logEvent(id, user.id, `Priority changed to ${priority}`);
  if (before.assignee_id !== assignee) {
    const who = assignee ? get<{ name: string }>("SELECT name FROM users WHERE id = ?", assignee)?.name : null;
    logEvent(id, user.id, who ? `Assigned to ${who}` : "Assignee cleared");
  }
  if (before.due_date !== dueDate) logEvent(id, user.id, dueDate ? `Due date set to ${dueDate}` : "Due date cleared");

  revalidatePath("/board");
  return { ok: true };
}

export async function deleteTask(id: string) {
  await requireUser();
  run("DELETE FROM tasks WHERE id = ?", id);
  revalidatePath("/board");
}

// ── Board structure (project name + columns) ────────────────────────────────

export async function addProject(name: string) {
  await requireUser();
  const clean = name.trim();
  if (!clean) return { error: "Project name is required." };

  const id = randomUUID();
  const next = get<{ n: number }>("SELECT COALESCE(MAX(position) + 1, 0) n FROM projects")!.n;
  transaction(() => {
    run("INSERT INTO projects (id, name, position, created_at) VALUES (?,?,?,?)", id, clean, next, now());
    // A project with no columns is a dead end, so seed the defaults.
    DEFAULT_COLUMNS.forEach((c, i) =>
      run(
        "INSERT INTO columns (id, project_id, title, color, position) VALUES (?,?,?,?,?)",
        randomUUID(), id, c.title, c.color, i,
      ),
    );
  });
  revalidatePath("/board");
  return { ok: true, id };
}

/** Removes the project and everything under it: columns, tasks, history, canvas sheets. */
export async function deleteProject(id: string) {
  const user = await requireUser();
  if (!user.is_admin) return { error: "Only admins can delete a project." };
  if (get<{ n: number }>("SELECT COUNT(*) n FROM projects")!.n <= 1) {
    return { error: "A workspace needs at least one project." };
  }
  run("DELETE FROM projects WHERE id = ?", id);
  revalidatePath("/board");
  return { ok: true };
}

export async function renameProject(id: string, name: string) {
  await requireUser();
  const clean = name.trim();
  if (!clean) return { error: "Project name is required." };
  run("UPDATE projects SET name = ? WHERE id = ?", clean, id);
  revalidatePath("/board");
  return { ok: true };
}

export async function addColumn(projectId: string, title: string, color: string) {
  await requireUser();
  const clean = title.trim();
  if (!clean) return { error: "Column name is required." };
  const next = get<{ n: number }>(
    "SELECT COALESCE(MAX(position) + 1, 0) n FROM columns WHERE project_id = ?",
    projectId,
  )!.n;
  run(
    "INSERT INTO columns (id, project_id, title, color, position) VALUES (?,?,?,?,?)",
    randomUUID(), projectId, clean, color, next,
  );
  revalidatePath("/board");
  return { ok: true };
}

export async function updateColumn(id: string, title: string, color: string) {
  await requireUser();
  const clean = title.trim();
  if (!clean) return { error: "Column name is required." };
  run("UPDATE columns SET title = ?, color = ? WHERE id = ?", clean, color, id);
  revalidatePath("/board");
  return { ok: true };
}

/** Deleting a column takes its tasks with it (FK cascade) — the UI confirms the count first. */
export async function deleteColumn(id: string) {
  await requireUser();
  const last = get<{ n: number }>(
    "SELECT COUNT(*) n FROM columns WHERE project_id = (SELECT project_id FROM columns WHERE id = ?)",
    id,
  )!.n;
  if (last <= 1) return { error: "A board needs at least one column." };
  run("DELETE FROM columns WHERE id = ?", id);
  revalidatePath("/board");
  return { ok: true };
}

/** Move a column left or right. Positions are renumbered densely afterwards. */
export async function moveColumn(id: string, direction: -1 | 1) {
  await requireUser();
  const col = get<{ project_id: string; position: number }>(
    "SELECT project_id, position FROM columns WHERE id = ?",
    id,
  );
  if (!col) return;
  const ordered = all<{ id: string }>(
    "SELECT id FROM columns WHERE project_id = ? ORDER BY position",
    col.project_id,
  ).map((r) => r.id);
  const from = ordered.indexOf(id);
  const to = from + direction;
  if (to < 0 || to >= ordered.length) return;
  ordered.splice(to, 0, ...ordered.splice(from, 1));
  transaction(() => ordered.forEach((cid, i) => run("UPDATE columns SET position = ? WHERE id = ?", i, cid)));
  revalidatePath("/board");
}


export async function fetchHistory(taskId: string) {
  await requireUser();
  const { taskHistory } = await import("./queries");
  return taskHistory(taskId);
}

// ── Canvas sheets ───────────────────────────────────────────────────────────

export async function createCanvas(projectId: string, name: string) {
  await requireUser();
  const clean = name.trim() || "Untitled sheet";
  const next = get<{ n: number }>("SELECT COALESCE(MAX(position) + 1, 0) n FROM canvases WHERE project_id = ?", projectId)!.n;
  const id = randomUUID();
  run(
    "INSERT INTO canvases (id, project_id, name, position, snapshot, updated_at) VALUES (?,?,?,?,NULL,?)",
    id, projectId, clean, next, now(),
  );
  revalidatePath("/board");
  return id;
}

export async function renameCanvas(id: string, name: string) {
  await requireUser();
  const clean = name.trim();
  if (!clean) return;
  run("UPDATE canvases SET name = ? WHERE id = ?", clean, id);
  revalidatePath("/board");
}

export async function deleteCanvas(id: string) {
  await requireUser();
  run("DELETE FROM canvases WHERE id = ?", id);
  revalidatePath("/board");
}
