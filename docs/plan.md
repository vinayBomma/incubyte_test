# Plan

Ordered and done top to bottom. Each task is 1–3 commits, and tests ship in the same commit as the code they cover.

## 0. Foundations
- [x] `git init`, `.gitignore`, docs (requirements, architecture, decisions, plan)
- [x] `AGENTS.md`: rules for the AI agent (TDD loop, layering, test rules)

## 1. Backend core
- [x] npm workspace (`shared`, `backend`), TypeScript config, Vitest
- [x] `@acme/shared`: country↔currency map, minor-unit helpers, zod employee schema, business rules, with unit tests
- [x] Express `createApp(deps)`, `/api/health`, error middleware, Drizzle table + generated migration, in-memory DB test helper
- [x] CI workflow running typecheck and tests

## 2. Employee CRUD
- [x] Repository + service + router: create (validation → 422 with field errors) and get (404)
- [x] Update (full replace, `updated_at` bumps) and delete (204/404)
- [x] List: pagination, name search (escaped `LIKE`), filters, allowlisted sort with id tie-break
- [x] `GET /meta/options`

## 3. Seed
- [x] `npm run seed`: deterministic PRNG, realistic salary ranges per country and role, single-transaction bulk insert, prints time taken
- [x] Tests: exact count, same seed → same data, salaries inside country ranges, rerun resets

## 4. Insights
- [x] Repository aggregations (per country, per job title within a country, org summary) tested on a tiny hand-made dataset with obvious answers
- [x] Service (half-up rounding, unsupported country → 404) and routes

## 5. Frontend
- [x] Vite + React + TS + Tailwind, Vitest + RTL, proxy `/api`; typed API client using `@acme/shared` types; employees page with pagination, search, filters and loading/empty/error states
- [x] Add/edit form validated by the shared rules, server 422s per field, delete with confirmation
- [x] Insights page: summary cards, country table, job-title breakdown for a chosen country

## 6. Ship
- [x] Config from env (`DATABASE_URL`, `CORS_ORIGINS`, `PORT`), CORS, seed on startup if the DB is empty
- [x] Benchmark script → `performance.md` (seed time, p50/p95, query plans with and without indexes)
- [x] `render.yaml`, `deployment.md`, README, `ai-usage.md`
- [x] Deploy to Render + Vercel; smoke test on the live URLs
- [x] Demo video link in the README
