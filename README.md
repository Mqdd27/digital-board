# Digital Board

Self-hosted work tracker. A kanban board with List, Calendar and Analytics views
over the same tasks, a free-form drawing canvas with multiple sheets, and
workspace chat with direct messages. Everything lives in one SQLite file on your
own machine — no third-party services.

Built for a team small enough to share one server: a homelab, a VPS, a machine in
the office.

## Quick start

```bash
git clone https://github.com/Mqdd27/digital-board.git
cd digital-board
npm install
npm run build
npm start
```

Open `http://localhost:3000`. The database is empty, so you land on `/setup` — a
one-time wizard for the workspace name, your first project, the board columns and
the admin account. It signs you in and drops you on the board.

Needs Node 22+. For development: `npm run dev`.

## Documentation

The app serves its own docs at **`/docs`** — installation, configuration,
deployment behind a reverse proxy, the data model, backups, upgrading and
troubleshooting. Run it and open `http://localhost:3000/docs`, or read
[`app/docs/page.tsx`](app/docs/page.tsx).

## What it does

| Area | |
|---|---|
| **Board** | Drag and drop with reordering inside a column and positional drops between columns. Mouse, touch and keyboard. Columns are add / rename / recolour / reorder / delete. |
| **List, Calendar, Analytics** | The same tasks as a table, on a month grid by due date, and as charts — column distribution, priority split, workload per member, 14-day activity. |
| **History** | Every move, reorder and field change is logged with its actor. Per task, and board-wide in the Inbox. |
| **Canvas** | tldraw with sheet tabs. Each sheet keeps its own drawing. |
| **Chat** | Workspace channel plus direct messages, with unread badges, attachments and a 15-minute edit window. |
| **Accounts** | Multi-user with `scrypt` password hashing and cookie sessions. Presence shows who is online. |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `./db/board.sqlite` | Database location. Attachments go in `uploads/` beside it. |
| `PORT` | `3000` | Listen port. |
| `TZ` | system | Timezone for rendered timestamps — they are formatted server-side. |

Session cookies are `secure` in production, so serve it over HTTPS or reach it on
`localhost`.

## Database

SQLite via `better-sqlite3`, created on first access. The schema is plain SQL in
[`lib/schema.sql`](lib/schema.sql), applied idempotently on every start; added
columns go through a small append-only list in `lib/db.ts`. There is no migration
command to run — upgrading is `git pull && npm install && npm run build`.

Backups are a file copy, safe while running:

```bash
sqlite3 "$DATABASE_PATH" ".backup '/backups/board.sqlite'"
tar czf /backups/uploads.tar.gz -C "$(dirname "$DATABASE_PATH")" uploads
```

The schema avoids SQLite-only features, so a Postgres port means replacing
`lib/db.ts` and running the same `schema.sql` — every query already lives in
`lib/queries.ts` and `lib/actions.ts`.

## Development

```bash
npm run lint
npx tsc --noEmit

# runnable checks, no test framework
node --experimental-strip-types lib/board.check.ts   # board helpers
node --experimental-strip-types lib/chat.check.ts    # chat poll merge
node lib/columns.check.mjs                           # column ordering + cascades

rm -rf db          # wipe and start from the wizard again
```

## Limits

Single instance only — SQLite is one file owned by one process. No self-service
password reset. Chat polls every 3 seconds rather than using a socket, and has no
deletion, reactions or threads. Attachment files are not garbage-collected. The
canvas does not follow the light/dark toggle.

Full list in the [docs](/docs).
