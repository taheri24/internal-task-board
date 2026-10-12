# AI-assisted development workflow

## Tools

- Claude Code for planning, backend implementation and tests.
- The frontend was drafted with the same agent, using `frontend-design` guidance first (see DESIGN.md).
- Project rules live in `CLAUDE.md`. Reusable instructions live in `skills.txt`.

## Process

1. **Specification first.** The requirements were refined into a written spec before any code was generated. The spec defines roles, the permission matrix, and the data model. That spec is the reference for review.
2. **Plan, then build.** For each area (auth, RBAC, tasks, UI), the agent first stated the design and the file list, then wrote the code.
3. **Review every generated file against the spec.** Items checked:
   - Every route has an explicit role or public marker.
   - Every 403 and 404 case matches `docs/permissions.md`.
   - No tokens reach JavaScript-readable storage or response bodies.
   - No HTML is stored or rendered from descriptions.
4. **Tests for the non-negotiables.** Three automated tests cover the required cases: a Member cannot view another user's task, a Member cannot modify users, and a disabled user cannot use an old token.
5. **Human decisions kept by the author.** Architecture, the choice of rewrite-based proxy, the database-check-per-request decision, and the permission proposals in `docs/permissions.md` are the author's and are open to challenge.

## What was not delegated

- Security-sensitive logic was reviewed line by line: cookie flags, refresh rotation and reuse detection, the last-Owner rule, and TipTap link validation.
- Dependency versions were chosen by hand and are pinned by range in `package.json`.

## Known gaps in the AI process

- Verification covered type checks, lint, builds, unit tests, migrations, the seed, and 48 live API security checks against PostgreSQL 16. Two things were not run: `docker compose up` and a manual browser pass over the UI. Both are the first steps a reviewer should take.
- Two defects were found and fixed only because of those checks: the TypeORM CLI rejected a double DataSource export, and the global rate limit would have been shared by all users behind the proxy.
