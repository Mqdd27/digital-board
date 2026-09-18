# Digital Board

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-5FA04E.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/postgres-%E2%89%A514-336791.svg)](https://www.postgresql.org)

Self-hosted work tracker. A kanban board with List, Calendar and Analytics views
over the same tasks, a free-form drawing canvas with multiple sheets, and
workspace chat with direct messages. Runs on your own machine against your own
PostgreSQL — no third-party services, no per-seat billing.

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

Open <http://localhost:3000>. The database is empty, so you land on `/setup` — a
one-time wizard for the workspace name, your first project, the board columns and
the admin account. Tables create themselves on first use; there is no migration
command.

Requires **Node 22+** and **PostgreSQL 14+** (verified on 16). For development,
`npm run dev`.

## Features

| Area | |
|---|---|
| **Board** | Drag and drop with reordering inside a column and positional drops between columns. Mouse, touch and keyboard. Columns are add / rename / recolour / reorder / delete. |
| **List, Calendar, Analytics** | The same tasks as a table, on a month grid by due date, and as charts — column distribution, priority split, workload per member, 14-day activity. |
| **History** | Every move, reorder and field change is logged with its actor. Per task, and board-wide in the Inbox. |
| **Canvas** | Excalidraw with sheet tabs. Each sheet keeps its own drawing. |
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

## Documentation

The app serves its own documentation at **`/docs`** — installation,
configuration, deployment with pm2 or systemd, the data model, architecture,
backups, upgrading and troubleshooting. Run it and open
<http://localhost:3000/docs>, or read [`app/docs/page.tsx`](app/docs/page.tsx).

## Database

PostgreSQL via `pg`, plain SQL, no ORM. The schema is
[`lib/schema.sql`](lib/schema.sql), applied idempotently on the first query;
columns added later sit at the bottom of that file as
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

[`lib/db.ts`](lib/db.ts) is the only file that knows about the driver. Every read
lives in [`lib/queries.ts`](lib/queries.ts) and every write in
[`lib/actions.ts`](lib/actions.ts).

Back up both halves — the database and the files:

```bash
pg_dump --no-owner --format=custom "$DATABASE_URL" > board.dump
tar czf uploads.tar.gz -C "$(dirname "$UPLOAD_DIR")" uploads
```

## Upgrading

```bash
git pull
npm install
npm run build
pm2 restart digital-board --update-env    # or restart however you run it
```

New columns apply themselves on the next query. Back up first anyway.

## Development

```bash
npm run dev
npm run lint
npx tsc --noEmit
```

Runnable checks, no test framework:

```bash
node --experimental-strip-types lib/board.check.ts   # board helpers
node --experimental-strip-types lib/chat.check.ts    # chat poll merge
DATABASE_URL=... node lib/postgres.check.mjs         # every app query, against real Postgres
```

`postgres.check.mjs` is safe to point at your own server: it runs inside a
transaction and rolls back.

## Known limits

No self-service password reset. Chat polls every 3 seconds rather than using a
socket, and has no deletion, reactions or threads. Attachment files are not
garbage-collected. Running more than one instance requires shared storage for
`UPLOAD_DIR`.

Full list in the [docs](/docs).

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `npm run lint`,
`npx tsc --noEmit` and the checks above, and keep SQL in `lib/queries.ts` /
`lib/actions.ts` rather than in components.

## License

[MIT](LICENSE) © Mqdd
