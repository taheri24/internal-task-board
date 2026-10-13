# Architecture

## Components

```
Browser ──► Next.js (3000) ──rewrite /api/v1/*──► NestJS (4000) ──► PostgreSQL (5433)
            UI, middleware                       auth, RBAC, API    migrations only
```

- The browser only ever talks to Next.js. The `/api/v1/*` rewrite forwards to NestJS, so cookies are first-party and the API origin is not exposed.
- Authorization is enforced in NestJS. The UI hides controls for convenience only.

## Authentication flow

1. `POST /auth/login` checks the argon2 hash, then sets two HttpOnly cookies:
   - `access_token`: a JWT, valid 15 minutes, path `/`.
   - `refresh_token`: an opaque random value, valid 14 days, path `/api/v1/auth`, SameSite Strict.
2. Every protected request runs `JwtAuthGuard`. It verifies the JWT and then reads the user from the database. If the user is inactive, the request fails immediately, even if the JWT is still unexpired. This is the mechanism behind "disabled users lose access at once".
3. When the access token expires, the client calls `POST /auth/refresh`. The server:
   - hashes the presented refresh token and looks it up,
   - revokes it and issues a new one (rotation),
   - if the token was already revoked (reuse), revokes every session for that user.
4. Refresh tokens are stored only as SHA-256 hashes.
5. Disabling a user revokes all of their refresh tokens in the same transaction as the update.

## Data

| Table | Notes |
|---|---|
| `users` | argon2 `password_hash`, `role` with CHECK constraint, `is_active` |
| `refresh_tokens` | `token_hash` unique, `revoked_at`, `expires_at` |
| `tasks` | `description jsonb` (TipTap JSON), `deleted_at` for soft delete, nullable `assignee_id` |
| `audit_logs` | before/after JSON for task and user changes |

The schema is created only by the migration in `src/database/migrations`. TypeORM `synchronize` is off.

## Health check

`GET /ping` (full path `/api/v1/ping`, because of the global prefix) reports the health of the process and the database in one shot:

- Public on purpose — `@Public()` bypasses `JwtAuthGuard`, so an orchestration probe needs no session.
- Runs `SELECT NOW()` against PostgreSQL and reports round-trip latency plus the database server time (useful for spotting clock drift).
- Reports row counts for `users`, `tasks` (live board size; soft-deleted rows are excluded by TypeORM), `audit_logs`, and `refresh_tokens`. Only aggregates are exposed, never row contents.
- Returns HTTP 200 with `status: "ok"` while the process and database are reachable, and HTTP 503 with `status: "down"` plus the driver error when the database connection is lost after startup. (If the database is unreachable at boot, NestJS itself fails to start, so probes see a closed port instead.)

## TipTap storage

Descriptions are stored as TipTap JSON in `jsonb`. HTML is never stored or trusted. `tiptap.validator.ts` runs on every write and enforces:

- Allowed nodes: doc, paragraph, text, heading (levels 2 and 3 in the UI), bulletList, orderedList, listItem, blockquote, hardBreak.
- Allowed marks: bold, italic, link. Link `href` must be `http:` or `https:`.
- Maximum nesting depth of 12 and maximum payload of 50 KB.

The read-only view renders the same JSON through the same editor component, so display and editing always agree.

## Decisions and why

- **Next.js rewrite as the proxy layer.** It meets the "browser talks only to Next" rule with no extra service. Trade-off: rewrites are resolved at build time, so `BACKEND_URL` is a build argument.
- **Database read on every request.** This costs one indexed lookup per call and gives immediate revocation of disabled users. A stateless JWT alone cannot provide that.
- **Policy as pure functions** (`todo-access.policy.ts`). Rules are testable without a database and read as a table.
- **Soft delete via `deleted_at`.** Users are never hard-deleted. Disabling is the removal path, which keeps history intact.
- **Audit log separate from the activity feed.** The audit log is for security and compliance. An activity timeline is listed as future work.
- **Optimistic status moves** with rollback on failure, so the board responds at once.
