# AGENTS.md: rules for AI agents working on this repo

Read `docs/requirements.md`, `docs/architecture.md`, `docs/decisions.md` and `docs/plan.md` before making changes. If a request conflicts with them, stop and ask.

## Workflow: strict TDD
1. **Red:** write one failing test for one behaviour. Run it and show that it fails for the expected reason.
2. **Green:** write the minimum code that makes it pass. Run the whole suite.
3. **Refactor:** improve names and structure with all tests passing. Explain each refactor, or say that none was needed.
4. **Stop** after each behaviour (red → green → refactor) for human review, unless told to continue. Commit only after approval, using Conventional Commit messages (`feat:`, `test:`, `refactor:`, `chore:`, `docs:`).

- If a new test passes immediately, prove it can fail: break the code it covers, watch it go red, restore.
- Never change or delete an existing test to make it pass without explaining why the test was wrong.
- No production code without a failing test that requires it. Wiring and config are the only exceptions.
- If something is ambiguous, ask. Don't guess silently.

## Code rules
- **Layering:** `routers → services → repositories`.
  - Routers handle HTTP only: parse input with zod, call one service function, send the result. No business logic and no queries.
  - Services hold the business rules and throw domain errors (`NotFoundError`, `DomainValidationError`). They never see `req`/`res`.
  - Repositories contain the only Drizzle queries.
  - The error middleware is the only place that maps errors to status codes.
- The API contract (schemas, rules, response types) lives in `@acme/shared`. Change it there, never duplicate it in the backend or frontend.
- TypeScript `strict`. No `any`; use `unknown` and narrow. Explicit return types on exported functions.
- Keep functions small and single-purpose. Prefer clear names to comments.
- Store money as integer minor units. Never use floats for money.
- Sort fields come from an allowlist mapped to columns. Never interpolate user input into SQL.
- Dependencies (DB, clock, CORS origins) are passed into `createApp()`; no module-level singletons.

## Test rules
- Fast (each suite runs in seconds), deterministic and independent of execution order.
- Backend: a fresh in-memory SQLite with migrations applied per test. No network, no sleeps, no real clock in assertions (inject `today`).
- One behaviour per test. Name tests by behaviour (`it('rejects a currency that does not match the country')`). Use arrange/act/assert.
- Test through the public surface: the service API, or HTTP via Supertest for router wiring and status codes. Frontend: React Testing Library by role/label, API module mocked.

## Commands
```bash
npm install                 # all workspaces
npm test                    # shared + backend + frontend
npm run typecheck
npm run lint

npm run dev -w backend      # http://localhost:8000, migrates and seeds if the DB is empty
npm run seed -w backend     # reset to 10,000 deterministic employees (--count, --seed)
npm run benchmark -w backend
npm run db:generate -w backend   # regenerate the migration after changing src/db/schema.ts
npm run dev -w frontend     # http://localhost:5173, proxies /api to :8000
```
