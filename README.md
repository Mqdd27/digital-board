# Digital Board

Self-hosted work tracker. A kanban board with List, Calendar and Analytics views
over the same tasks, a free-form drawing canvas with multiple sheets, and
workspace chat with direct messages. Runs on your own machine against your own
PostgreSQL — no third-party services.

## Quick start

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE board LOGIN PASSWORD 'choose-something';
CREATE DATABASE board OWNER board;
SQL

git clone https://github.com/Mqdd27/digital-board.git
cd digital-board
npm install

cp .env.example .env      # set DATABASE_URL
npm run build
npm start
```

Open `http://localhost:3000`. The database is empty, so you land on `/setup` — a
one-time wizard for the workspace name, your first project, the board columns and
the admin account. Tables create themselves on first use; there is no migration
command.

Needs Node 22+ and PostgreSQL 14+ (verified on 16). For development: `npm run dev`.

## Documentation

The app serves its own docs at **`/docs`** — installation, configuration,
migrating from SQLite, deployment with pm2 or systemd, the data model, backups,
upgrading and troubleshooting. Run it and open `http://localhost:3000/docs`, or
read [`app/docs/page.tsx`](app/docs/page.tsx).

## Upgrading from the SQLite version

Earlier releases stored everything in `db/board.sqlite`. The importer copies it
into Postgres and **never writes to the SQLite file**, so it stays a working
rollback.

```bash
cp db/board.sqlite db/board.sqlite.bak        # belt and braces
DATABASE_URL=postgres://... npm run import:sqlite -- ./db/board.sqlite
DATABASE_URL=postgres://... node lib/postgres.check.mjs
```

It runs in one transaction, compares row counts at the end, advances the identity
sequences past the imported ids, copies `db/uploads/` to `UPLOAD_DIR`, and refuses
to run twice without `--force`. Login sessions are not carried over — everyone
signs in once more.

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
| `DATABASE_URL` | — | **Required.** Postgres connection string. |
| `UPLOAD_DIR` | `./uploads` | Where chat attachments are written. |
| `DATABASE_POOL_MAX` | `10` | Maximum pooled Postgres connections. |
| `PORT` | `3000` | Listen port. |
| `TZ` | system | Timezone for rendered timestamps — they are formatted server-side. |

Session cookies are `secure` in production, so serve it over HTTPS or reach it on
`localhost`.

## Database

PostgreSQL via `pg`, plain SQL, no ORM. The schema is
[`lib/schema.sql`](lib/schema.sql), applied idempotently on the first query;
columns added later sit at the bottom of that file as `ALTER TABLE … ADD COLUMN IF
NOT EXISTS`. Upgrading is `git pull && npm install && npm run build`.

Back up both halves — the database and the files:

```bash
pg_dump --no-owner --format=custom "$DATABASE_URL" > board.dump
tar czf uploads.tar.gz -C "$(dirname "$UPLOAD_DIR")" uploads
```

`lib/db.ts` is the only file that knows about the driver; every query lives in
`lib/queries.ts` and `lib/actions.ts`.

## Development

```bash
npm run lint
npx tsc --noEmit

# runnable checks, no test framework
node --experimental-strip-types lib/board.check.ts   # board helpers
node --experimental-strip-types lib/chat.check.ts    # chat poll merge
DATABASE_URL=... node lib/postgres.check.mjs         # every app query, against real Postgres
```

`postgres.check.mjs` is safe to point at your own server: it works inside a
transaction and rolls back.

## Limits

No self-service password reset. Chat polls every 3 seconds rather than using a
socket, and has no deletion, reactions or threads. Attachment files are not
garbage-collected. The canvas does not follow the light/dark toggle. Running more
than one instance requires shared storage for `UPLOAD_DIR`.

Full list in the [docs](/docs).
