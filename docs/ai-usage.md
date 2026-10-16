# AI usage

How AI was used to build this, and how its output was kept correct.

## Tools

| Tool | Used for |
|---|---|
| GitHub Copilot agent in VS Code (chat + agent mode) | Pair-planning, docs, test-first implementation, running tests/benchmarks, clean-clone and smoke tests |

No other AI tools were used.

## How I worked with the agent

1. **Think before code.** The first prompt asked the agent, acting as a senior pair, for the real problem, the HR manager's jobs-to-be-done, ambiguities with assumptions, and time-box risks. No code yet. I then made the calls on the open questions: Express 5 + zod, Drizzle + SQLite, a shared contract package, no FX conversion, integer minor units, no auth, and Tailwind instead of Mantine.
2. **Docs as the contract.** [requirements.md](requirements.md) → [architecture.md](architecture.md) + [decisions.md](decisions.md) → [plan.md](plan.md) were written and reviewed before any code. [AGENTS.md](../AGENTS.md) turns them into rules the agent must read first.
3. **Strict TDD, one behaviour at a time** (AGENTS.md):
   - **Red:** one failing test, shown failing for the expected reason.
   - **Green:** the minimum code, then the full suite.
   - **Refactor:** with an explanation, or "none needed".
   - **Stop for review.**
4. **Mutation checks.** When a new test passed immediately (the behaviour already existed), the agent temporarily broke the production code to prove the test could fail, then restored it. This caught weak tests (below).
5. **Review gates and commits.** The agent stopped after each step. I reviewed the diff and approved, and only then was it committed. Small, tightly coupled steps were grouped into one Conventional Commit, so the history in `git log` mirrors [plan.md](plan.md).
6. **Questions over guesses.** When something was ambiguous (ORM choice, shared package vs duplicated types, hosting persistence, commit granularity), the agent asked with concrete options and a recommendation instead of assuming.
7. **Verify, don't trust.** Numbers in the docs come from runs, not estimates: [performance.md](performance.md) comes from `npm run benchmark`. Deployment was rehearsed with a fresh `git clone` + `npm ci` + tests + build + a real server start with CORS before going live.

## Key prompts (abridged)

1. *"Before writing anything, act as my senior pair. Summarise the real problem and the HR manager persona's top 5 jobs-to-be-done, questions/ambiguities each with a sensible assumption, and risks for a time-boxed take-home. Stack: Node + Express + TypeScript, SQLite, React + Vite + TypeScript. Don't write code yet."*
2. *"Create docs/requirements.md, max one page: goal and measurable success criteria, persona, in-scope user stories with acceptance criteria, deliberately out of scope with one line of reasoning each, assumptions. Ask questions."*
3. *"Create docs/architecture.md (Mermaid system, ER and sequence diagrams, layering, API contract table, validation rules), docs/decisions.md (short ADRs), docs/plan.md (ordered checklist, each task 1–3 commits)."*
4. *"Create AGENTS.md: strict TDD (one failing test → minimum code → refactor, stop after each step for my review and commit); no business logic in routers; strict TypeScript; small functions; tests fast, deterministic, in-memory SQLite; never change a test to make it pass without explaining why."*
5. *"Put the employee schema and business rules in one shared package so the API and the form validate the same way. Then scaffold the Express backend with a health endpoint, error middleware, Drizzle schema and CI."*
6. *"Implement employee management with strict TDD, one behaviour at a time: create (with validation), get, update, delete, then list with pagination, search, filters and sorting."*
7. *"Seed script: 10,000 employees, deterministic, realistic salary ranges per country, bulk inserts, prints time taken. Insights via SQL aggregations, tested with a tiny hand-made dataset where expected numbers are obvious."*
8. *"Frontend in small steps: typed API client + employees page; add/edit form with validation and delete with confirmation; insights page. Loading, empty and error states everywhere. Plain hooks, no state library."*
9. *"docs/performance.md with real measurements incl. EXPLAIN QUERY PLAN with/without indexes; deploy backend on Render (seed on start if DB empty) and frontend on Vercel; README; this document."*

## Issues the process caught

Found by the TDD loop, mutation checks, or verifying instead of assuming:

- **Escaped `LIKE` broke silently.** Writing `ESCAPE '\'` inside a JS template literal produced `ESCAPE ''`, so every search returned a 500. The search tests caught it; the code now uses `'\\'`.
- **Sort tie-break.** The first list implementation broke ties with `id` in the same direction as the sort. The test expects `id ASC` always (stable paging whatever the sort direction), so it was fixed.
- **Weak tests.** Mutation checks confirmed that removing `escapeLike`, the seed salary clamp, the hire-date rule or the currency-must-match-country rule each fails a test. Raising the shared salary cap fails a *frontend* form test, proving the form really uses the shared rules. One mutant survived: removing the explicit `ORDER BY` for job titles, because SQLite's `GROUP BY` happens to return them sorted. The `ORDER BY` stays, because implicit group order isn't guaranteed.
- **Dependencies silently dropped.** A later `npm i -D` in the same workspace removed the runtime dependencies just installed. It surfaced when drizzle-kit asked for drizzle-orm, and was fixed and checked with `npm ls`.
- **Clean install compiled from source.** A fresh clone's `npm ci` tried to run `node-gyp` for `better-sqlite3@13`, which fails without a C++ toolchain. Pinned to `12.11.1` (uses prebuilt binaries), with a root `overrides` entry so drizzle-orm's peer uses the same version.
- **Line endings.** Files created on Windows mixed CRLF and LF. `.gitattributes` now enforces LF.
- **Bundle-size trade-off.** Sharing the zod schema with the UI grew the JS bundle from about 74 KB to 98.5 KB gzipped. Measured and accepted ([ADR-2](decisions.md#adr-2-one-shared-zod-package-for-the-api-contract)).

## Where I corrected the AI

| # | What the AI proposed / did | What I changed | Why |
|---|---|---|---|
| 1 | The agent's plan used Mantine as the component library. | Dropped Mantine for Tailwind CSS with a few small hand-written components (modal, confirm dialog, stat card). | Mantine would have needed browser polyfills (e.g. `matchMedia` and `ResizeObserver` in jsdom for Vitest), adding setup and test noise. The UI only needs a table, a form, a modal and cards, which Tailwind covers with fewer dependencies. |
| 2 | For hosting, the agent's first options were persistent setups (a paid Render disk, or free Render Postgres). | Chose Render free with ephemeral SQLite that reseeds on start, documented as a demo limitation (ADR-10). | Render's free Postgres expires after 30 days, and moving to Postgres would have meant schema and CI changes in a time-boxed task. Fake, deterministic seed data makes an ephemeral DB acceptable for a demo. |
| 3 | The agent tended to work in long stretches and propose many fine-grained commits. | Made it stop after every red → green → refactor step for my review (AGENTS.md), and had small, tightly coupled steps squashed into one commit each. | Review gates catch wrong assumptions early. Commit granularity is my call, so the history reads as meaningful steps rather than noise. |
| 4 | Drafting docs, the agent filled gaps with plausible but unverified details (test counts, log lines, placeholder deploy URLs). | Required every number in the docs to come from a real run, and told it never to invent URLs. | Docs a reviewer can't trust are worse than no docs. performance.md and deployment.md are backed by actual measurements and smoke tests. |
| 5 | Left alone, the agent would resolve ambiguities itself (e.g. currency conversion, money type, auth, ORM). | Told it to ask whenever something was ambiguous, and made the product and stack decisions myself: per-country insights with no FX, integer minor units, no auth, Drizzle (ADR-3, 4, 5, 8). | These are trade-offs that should be explicit and owned by me, not silently assumed by the tool. |
