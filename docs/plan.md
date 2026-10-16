# Plan

Ordered and done top to bottom. Each task is 1–3 commits, and tests ship in the same commit as the code they cover.

## 0. Foundations
- [ ] `git init`, `.gitignore`, docs (requirements, architecture, decisions, plan)
- [ ] `AGENTS.md`: rules for the AI agent (TDD loop, layering, test rules)

## 1. Backend core
- [ ] npm workspace (`shared`, `backend`), TypeScript config, Vitest
- [ ] `@acme/shared`: country↔currency map, minor-unit helpers, zod employee schema, business rules, with unit tests
- [ ] Express `createApp(deps)`, `/api/health`, error middleware, Drizzle table + generated migration, in-memory DB test helper
- [ ] CI workflow running typecheck and tests

## 2. Employee CRUD
- [ ] Repository + service + router: create (validation → 422 with field errors) and get (404)
- [ ] Update (full replace, `updated_at` bumps) and delete (204/404)
- [ ] List: pagination, name search (escaped `LIKE`), filters, allowlisted sort with id tie-break
- [ ] `GET /meta/options`

## 3. Seed
- [ ] `npm run seed`: deterministic PRNG, realistic salary ranges per country and role, single-transaction bulk insert, prints time taken
- [ ] Tests: exact count, same seed → same data, salaries inside country ranges, rerun resets

## 4. Insights
- [ ] Repository aggregations (per country, per job title within a country, org summary) tested on a tiny hand-made dataset with obvious answers
- [ ] Service (half-up rounding, unsupported country → 404) and routes

## 5. Frontend
- [ ] Vite + React + TS + Tailwind, Vitest + RTL, proxy `/api`; typed API client using `@acme/shared` types; employees page with pagination, search, filters and loading/empty/error states
- [ ] Add/edit form validated by the shared rules, server 422s per field, delete with confirmation
- [ ] Insights page: summary cards, country table, job-title breakdown for a chosen country

## 6. Ship
- [ ] Config from env (`DATABASE_URL`, `CORS_ORIGINS`, `PORT`), CORS, seed on startup if the DB is empty
- [ ] Benchmark script → `performance.md` (seed time, p50/p95, query plans with and without indexes)
- [ ] `render.yaml`, `deployment.md`, README, `ai-usage.md`
- [ ] Deploy to Render + Vercel; smoke test on the live URLs
- [ ] Demo video link in the README
