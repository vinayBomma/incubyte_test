# ACME Salary Management (Node + TypeScript)

A web app that lets ACME's HR manager manage salary data for 10,000 employees across 10 countries, replacing a set of Excel files. It also answers "how do we pay people?" with per-country insights.

- **Employees:** paginated list with name search, filters (country, job title, department) and sorting in the API. Add, edit and delete, with validation.
- **Insights:** org summary (headcount, countries, departments); per-country min/max/average salary and headcount, in local currency; average salary per job title within a country.
- **Seed:** 10,000 deterministic, realistic employees in about 0.5 s.

Stack: Node 22 · Express 5 · Drizzle ORM · SQLite (better-sqlite3) · zod · Vitest + Supertest | React 19 · Vite · TypeScript · Tailwind · Vitest + React Testing Library. One npm workspace; the `shared` package holds the zod contract used by **both** the API and the form.

## Live demo

| | URL |
|---|---|
| App (Vercel) | https://incubyte-test.vercel.app/ |
| API (Render) | https://acme-salary-api-82ci.onrender.com ([health](https://acme-salary-api-82ci.onrender.com/api/health), [summary](https://acme-salary-api-82ci.onrender.com/api/insights/summary)) |
| Demo video | https://vimeo.com/reviews/d6572f37-725f-4663-b734-7a0e1b17e3db/videos/1235078202 |

The API runs on Render's free tier. The first request after 15 minutes idle takes about a minute, and the data resets to the seed on every restart ([why](docs/decisions.md#adr-10-demo-hosting-with-render-free--ephemeral-sqlite-vercel-for-the-spa)).

## Run locally

Prerequisite: Node 22.12+ (npm 10+).

```bash
npm install                 # installs all three workspaces from the repo root

npm run dev -w backend      # API on http://127.0.0.1:8000; creates backend/salary.db and seeds 10,000 employees on first start
npm run dev -w frontend     # UI on http://localhost:5173; proxies /api to the backend
```

Other backend commands:

```bash
npm run seed -w backend                      # reset the data (options: --count, --seed)
npm run benchmark -w backend                 # timings + EXPLAIN QUERY PLAN on 10k rows (docs/performance.md)
npm run db:generate -w backend               # regenerate the Drizzle migration after a schema change
```

## Tests

```bash
npm test             # shared (30) + backend (99) + frontend (70); in-memory SQLite, no network, a few seconds each
npm run typecheck
npm run lint
```

All three run in GitHub Actions on every push ([ci.yml](.github/workflows/ci.yml)).

## Structure

```
shared/src/          @acme/shared: countries → currency + minor units, zod employee schema,
                     business rules, query schema, API types (one contract for API and UI)
backend/
  src/
    routers/         HTTP only: parse, call a service, map errors
    services/        business rules (rounding, not-found), raise domain errors
    repositories/    all Drizzle queries, incl. SQL aggregations for insights
    db/              Drizzle schema + connection (WAL, migrations)
    http/            error middleware: domain errors → 404/422, malformed JSON → 400
    app.ts           createApp(deps): injected db, clock and CORS origins
    config.ts        settings from env (DATABASE_URL, PORT, CORS_ORIGINS)
    seed.ts          deterministic 10k seed (+ seed-data/ name lists)
  drizzle/           generated SQL migration (table + 3 indexes)
  scripts/benchmark.ts
  tests/
frontend/src/
  api/               typed fetch client; types re-exported from @acme/shared
  pages/             EmployeesPage, InsightsPage
  components/        form, modal, filters, pagination, stat cards, feedback states
  hooks/ lib/        useAsync, useDebouncedValue; money + form validation (shared rules)
docs/                see below
render.yaml          Render Blueprint for the API
```

## Docs

| Doc | What's in it |
|---|---|
| [requirements.md](docs/requirements.md) | Goal, success criteria, scope, what's out and why |
| [architecture.md](docs/architecture.md) | System, ER and sequence diagrams, layering, API contract, validation |
| [decisions.md](docs/decisions.md) | ADRs: Express, shared zod contract, Drizzle + SQLite, integer money, no FX, SQL aggregation, pagination, no auth, tsx, hosting |
| [plan.md](docs/plan.md) | Ordered task checklist that drove the commits |
| [performance.md](docs/performance.md) | Measured seed time, p50/p95 latency, query plans with/without indexes |
| [deployment.md](docs/deployment.md) | Exact Render + Vercel steps, env vars, free-tier limits |
| [ai-usage.md](docs/ai-usage.md) | How AI was used: tools, TDD loop, review gates, prompts, corrections |
| [AGENTS.md](AGENTS.md) | Rules the AI agent followed on this repo |
