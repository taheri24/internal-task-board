# Agent instructions for this repository

This file is read by AI coding assistants before they change anything.

## Project

Task Board: a small internal task tool with Persian RTL UI, role-based access, and TipTap descriptions.

- `backend/`: NestJS 10, TypeORM 0.3, PostgreSQL 16, argon2, class-validator.
- `frontend/`: Next.js 14 (App Router), TypeScript, Tailwind 3, Headless UI 2, TipTap 2.
- `docs/`: architecture and permissions. Keep them accurate when behaviour changes.

## Non-negotiable rules

1. Authorization is enforced in NestJS. UI hiding is never the security layer.
2. The browser calls only `/api/v1/*` on Next.js. Never call NestJS directly from the client.
3. Access and refresh tokens are HttpOnly cookies. Never put them in JS-readable storage or response bodies.
4. Schema changes go through migrations only. `synchronize` stays false.
5. Descriptions are TipTap JSON in `jsonb`. HTML is never the source of truth.
6. Unknown fields are rejected on every DTO.
7. Error responses use `{ statusCode, error, message, details?, requestId }`.
8. The UI is Persian and RTL. Use logical CSS properties.
9. No admin UI frameworks such as MUI or Ant Design.

## Commands

```bash
docker compose up --build              # full stack
cd backend && npm test                 # RBAC, guard, and policy tests
cd backend && npm run migration:run    # after npm run build
cd backend && npm run seed             # idempotent
cd frontend && npm run lint && npm run typecheck
```

## Before you finish a change

- Run the commands above that apply to the files you touched.
- If you changed a permission, update `docs/permissions.md` and add or update a test.
- If you added a dependency, say why in the PR description.
- Report honestly what you ran and what you did not run.

## Style

- Keep backend rules in `*.policy.ts` as pure functions where possible.
- Prefer small components. A component that is only used once stays in its page file.
- Do not add comments that restate the code. Comment only on why something is non-obvious.
