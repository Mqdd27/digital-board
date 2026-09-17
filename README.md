# Digital Board

Self-hosted kanban. Board, list, calendar and analytics views over a single
SQLite file, plus a free-form drawing canvas with multiple sheets. Multi-user
with password login. No third-party services.

## Running it

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000`. The database starts empty, so you'll be sent to
`/setup` — a one-time wizard that asks for a workspace name, a first project,
which board columns to create, and your admin account. It signs you in and drops
you on the board.

For development: `npm run dev`.

## Database

SQLite, created automatically at `./db/board.sqlite` on first access. The schema
lives in `lib/schema.sql` and is applied idempotently (`CREATE TABLE IF NOT
EXISTS`) on every start, so there is no migration command to run.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `./db/board.sqlite` | Where the database file lives; uploads go in `uploads/` beside it |
| `TZ` | system | Timezone used to render timestamps (they are formatted server-side) |

Backups are a file copy — stop the server first, or use `sqlite3 .backup`.

### Why SQLite

One instance, one file, no external dependency; that is the lightest thing to
self-host. The schema avoids SQLite-only features, so moving to Postgres later
means replacing `lib/db.ts` and running the same `schema.sql` — every query is
already isolated in `lib/queries.ts` and `lib/actions.ts`.

## Accounts

The first account is created by the wizard and becomes the admin. Admins add
people from **Settings** in the sidebar: name, email and a temporary password to
hand over.

Passwords are hashed with `scrypt` from `node:crypto`. Sessions are a random
32-byte token stored in the `sessions` table and an `httpOnly` cookie, valid for
30 days.

## Projects

Add and delete projects from **Settings**. A new project starts with the default
columns so it is usable immediately. Deleting one removes its columns, tasks,
history and canvas sheets — admins only, the UI confirms first, and the last
remaining project cannot be deleted. Switch projects from the sidebar.

## Board structure

Columns are not fixed. The wizard offers four common ones and a free-text field
for your own, and from the board you can add a column, rename it, recolour it,
reorder it left/right, or delete it — click a column name to open its editor, or
use **Add column** at the right edge. The board name is click-to-rename from the
header or from Home.

Deleting a column deletes its tasks (foreign-key cascade), so the UI confirms the
count first, and the last remaining column cannot be deleted.

## Chat and presence

**Chat** in the sidebar has a workspace channel everyone can read, plus a direct
message thread per member. Messages live in one `messages` table — a `NULL`
recipient is the channel, a user id is a DM.

Messages carry **attachments** (up to 5 files, 10 MB each), can be **edited** by
their author for 15 minutes, and unread counts show as **badges** per
conversation and on the sidebar Chat row. Opening a conversation is what marks it
read. Uploaded files are stored beside the database in `db/uploads/` and served
only through `/api/files/[id]`, which requires a session — attachments are never
public URLs.

Chat runs on a 3-second poll against `/api/chat`, not a WebSocket: a single
self-hosted instance does not justify a socket server.

**Presence** is derived from `users.last_seen_at`, which every authenticated
request stamps (throttled to one write per 45s per user) — not just chat, so
someone who never opens Chat still shows as online. Status is **online** under
2 minutes, **away** under 15, **offline** beyond. The workspace pings
`/api/presence` every 45 seconds so an idle open tab stays online and badges stay
live. No separate presence store to get out of sync.

Direct messages are filtered server-side by the signed-in user, so asking for
someone else's thread returns nothing.

## Canvas sheets

The Canvas section is a tldraw surface with tabs. Each sheet is a row in the
`canvases` table holding a tldraw snapshot, saved on a debounce as you draw and
flushed when you switch sheets or close the tab. Switching sheets never touches
another sheet's drawing.

## Checks

```bash
npm run lint
npx tsc --noEmit
node --experimental-strip-types lib/board.check.ts   # pure client helpers
node --experimental-strip-types lib/chat.check.ts    # chat poll merge
node lib/columns.check.mjs                           # column ordering + cascades
```

## Known limitations

- No self-service password reset; an admin recreates the account.
- Chat has no message deletion, reactions, threads, or typing indicators.
- Chat polls every 3 seconds; it is not instant and does not scale to large teams.
- Attachments are never garbage-collected: deleting a message removes its row but leaves the file in `db/uploads/`.
- Columns reorder one step at a time from the editor; there is no drag-to-reorder for columns themselves.
- No official Docker image yet.
