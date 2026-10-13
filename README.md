# Task Board

A small internal task tool: sign-in with HttpOnly cookies, role-based access enforced in the API, a Kanban board and list of tasks with a clear assignee, TipTap rich descriptions, and an interface in Persian with right-to-left layout.

## Quick start (Docker)

```bash
docker compose up --build
```

- Web app: http://localhost:3000
- API (direct, for debugging): http://localhost:4000/api/v1
- PostgreSQL: localhost:5433 (user `taskboard`, password `taskboard`)

On the first start, the backend container runs the migrations and then the seed. Both steps are safe to repeat.

## Sample accounts

| Role | Email | Password |
|---|---|---|
| Owner | owner@taskboard.local | Owner@12345 |
| Manager | manager@taskboard.local | Manager@12345 |
| Member | member@taskboard.local | Member@12345 |

These are for local development only. Change them before any shared deployment.

## Local development without Docker

Requires Node.js 20+ and a running PostgreSQL 16.

```bash
# backend
cd backend
cp .env.example .env            # set DATABASE_URL and JWT_SECRET (32+ chars)
npm ci
npm run build
npm run migration:run           # schema is created only by migrations
npm run seed                    # idempotent
npm start                       # http://localhost:4000

# frontend (new terminal)
cd frontend
npm ci
BACKEND_URL=http://localhost:4000 npm run dev    # http://localhost:3000
```

## Migrations and seed

- `npm run migration:run` applies pending migrations from `backend/src/database/migrations`.
- `npm run migration:revert` rolls back the last one.
- `npm run seed` creates the three accounts and, if the task table is empty, four sample tasks. Existing users are left alone, and passwords are never reset.

## Tests

```bash
cd backend && npm test                       # unit tests (10)
LOGIN_RATE_LIMIT=500 backend/scripts/e2e-security.sh   # 51 live API checks (needs migrated + seeded DB and a running API)
```

Covered by automated tests:

1. A Member cannot view another user's tasks (`todo-access.policy.spec.ts`).
2. A Member cannot modify users (`roles.guard.spec.ts`).
3. A disabled user cannot use an old access token (`jwt-auth.guard.spec.ts`).
4. `GET /api/v1/ping` reports database health and entity counts, and degrades gracefully (`health.service.spec.ts`).

## Architecture

See `docs/architecture.md` for the full picture, including the authentication flow and TipTap storage. In brief:

- **Monorepo.** `frontend/` (Next.js) and `backend/` (NestJS) are separate. `docs/` holds the design documents.
- **Single entry point.** The browser calls `/api/v1/*` on Next.js only. A rewrite forwards those calls to NestJS.
- **Health.** `GET /api/v1/ping` is public (no session needed) and reports process uptime, memory, database latency, and row counts for `users`, `tasks`, `audit_logs`, and `refresh_tokens`. It returns HTTP 503 with the driver error when the database is unreachable.
- **Cookies.** `access_token` (15 minutes, path `/`) and `refresh_token` (14 days, path `/api/v1/auth`) are both HttpOnly.
- **Revocation.** Each request reads the user and checks `is_active`. A disabled user loses access immediately.
- **Refresh rotation.** Each refresh issues a new token and revokes the old one. Reuse of a revoked token revokes all of that user's sessions.
- **Storage.** Refresh tokens are stored as SHA-256 hashes. Descriptions are TipTap JSON in `jsonb`, validated on the server against an allow-list.
- **Permissions.** `docs/permissions.md` is the matrix. The rules are in `todo-access.policy.ts`.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `JWT_SECRET` | backend | Signing key, at least 32 characters. The server refuses to start without it. |
| `COOKIE_SECURE` | backend | Set `true` behind HTTPS |
| `PORT` | backend | Defaults to 4000 |
| `BACKEND_URL` | frontend (build time) | Target of the `/api/v1/*` rewrite |

## Known limitations

These are real gaps in this submission. They are listed so that nothing is hidden.

- **Verification status.** Checked in the authoring environment: backend and frontend type-check and lint cleanly, the backend builds, the ten Jest tests pass, the migration and seed run (and the seed is idempotent) on PostgreSQL 16, 50 of the 51 end-to-end security checks in `backend/scripts/e2e-security.sh` pass against the live API (the one failure is a pre-existing rate-limit flake: the script needs the API itself started with `LOGIN_RATE_LIMIT=500`, not only the script), the new `/api/v1/ping` checks pass, and the Next.js production build succeeds with the API proxy and security headers verified. **Not checked:** `docker compose up` itself, interactive browser testing of the UI, and visual review on phones.
- **Not built:** drag-and-drop between lanes (status changes use the card menu, which is keyboard-accessible); multi-select filters (single select only); cursor pagination (the list returns up to 200 tasks); infinite scroll.
- **Not built:** comments and an activity timeline per task. The audit log is recorded server-side but has no viewer.
- **Not built:** a Trash screen. The API supports `GET /todos/trash` and `POST /todos/:id/restore` for Owners and Managers, but the UI has no page for them yet.
- **Not built:** real-time updates, dark mode, CSV/JSON export, an analytics dashboard, and keyboard shortcuts.
- **Rate limiting** is in-memory per process and does not coordinate across replicas. The client key trusts `X-Forwarded-For`, which a client can forge if it can reach port 4000 directly. Do not publish the API port in production; only Next.js should reach it.
- **Last-Owner check** runs in two queries and is not wrapped in a row lock. Two simultaneous requests could in theory both pass it. A transaction with `SELECT … FOR UPDATE` would close that window.
- **Due dates** use the Gregorian date picker and display in the Persian calendar. Persian input is not provided.
- **Fonts** are vendored. Vazirmatn (SIL Open Font License, see `frontend/app/fonts/OFL-Vazirmatn.txt`) is loaded locally, so builds do not contact external font hosts.
- **Demo video:** the Persian-language recording was not produced. It is a manual step.
- **Seed passwords** are fixed for convenience. They are documented on purpose, and they must not be used in any shared environment.

## Docs

- `DESIGN.md`: palette, type, layout and principles.
- `docs/architecture.md`: components, auth flow, data model, decisions.
- `docs/permissions.md`: role matrix and open decisions.
- `CLAUDE.md`: rules for AI coding assistants.
- `skills.txt`: reusable instructions and review checklists.
- `AI-WORKFLOW.md`: how AI was used and how its output was reviewed.
