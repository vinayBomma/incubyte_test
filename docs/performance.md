# Performance

Real measurements on 10,000 seeded employees. Reproduce with:

```bash
npm run benchmark -w backend
```

[`backend/scripts/benchmark.ts`](../backend/scripts/benchmark.ts) seeds a temporary SQLite file 3 times and times each run. It then sends 50 requests per scenario after 5 warm-up requests. For four scenarios it captures the exact SQL Drizzle runs (through a query logger) and calls `EXPLAIN QUERY PLAN` on it. Finally it drops all three indexes, opens a fresh connection and repeats.

**Setup:** Windows development laptop, Node 22.17, better-sqlite3 13 (SQLite 3.53), file-backed database in WAL mode.

**What the numbers mean:** each request goes through Supertest, which starts an ephemeral listener and makes a real loopback HTTP call. So the numbers include HTTP parsing, routing, zod validation, the service, SQL and JSON serialisation, but **no real network or TLS**. On Render's free tier, add network round-trip time and a cold start of about a minute after idling ([deployment.md](deployment.md)).

## Targets (from [requirements.md](requirements.md))

| Target | Result |
|---|---|
| List API < 300 ms p95 on 10k rows | 5–26 ms across all list scenarios ✅ |
| Insights API < 500 ms p95 | 6–14 ms ✅ |
| Seed 10k in < 10 s | 0.42–0.57 s ✅ (fast enough to seed on every fresh deploy) |

## Seed

| Run | 1 | 2 | 3 |
|---|---:|---:|---:|
| Benchmark run A | 0.57 s | 0.46 s | 0.54 s |
| Benchmark run B | 0.51 s | 0.46 s | 0.42 s |

The seed generates plain objects and inserts them in chunks of 1,000 rows (one multi-row `INSERT` each, keeping well under SQLite's bound-parameter limit), all inside a single transaction. That transaction is what makes it fast: without it, SQLite would sync to disk after each statement.

## Endpoint latency (ms, run B)

| Scenario | p50 indexed | p95 indexed | p50 no index | p95 no index |
|---|---:|---:|---:|---:|
| List, default (page 1, sort by name) | 5.6 | 7.1 | 5.4 | 6.5 |
| List, search `son` | 7.6 | 9.2 | 7.4 | 9.6 |
| List, filter country | 5.0 | 6.6 | 6.5 | 7.9 |
| List, filter country + job title | 3.6 | 5.4 | 6.0 | 7.4 |
| List, sort salary desc | 5.0 | 6.9 | 4.9 | 6.7 |
| List, deep page (page 400 of 400) | 23.5 | 26.1 | 23.4 | 26.0 |
| Insights, org summary | 6.2 | 7.8 | 5.8 | 7.8 |
| Insights, per country | 11.5 | 13.6 | 11.5 | 13.9 |
| Insights, job titles in a country | 4.3 | 6.3 | 5.4 | 6.7 |

Run A was within about 1 ms of run B on every row except search, where its p95 was 15.0 ms (a single-run outlier).

## Query plans

All plans come from `EXPLAIN QUERY PLAN` on the exact SQL Drizzle emitted.

| Query | With indexes | Without indexes |
|---|---|---|
| List: `WHERE country=? AND job_title=? ORDER BY full_name, id LIMIT ?` | `SEARCH USING INDEX ix_employee_country_job_title (country=? AND job_title=?)` + `TEMP B-TREE FOR ORDER BY` | `SCAN employees` + `TEMP B-TREE FOR ORDER BY` |
| List count for the same filter | `SEARCH USING COVERING INDEX ix_employee_country_job_title` | `SCAN employees` |
| List, no filter: `ORDER BY full_name, id` | `SCAN employees` + `TEMP B-TREE FOR ORDER BY` | same |
| Count, no filter | `SCAN USING COVERING INDEX ix_employee_job_title` (smallest index to count) | `SCAN employees` |
| Insights per country: `GROUP BY country, currency` | `SCAN USING INDEX ix_employee_country` + temp B-trees for GROUP BY/ORDER BY | `SCAN employees` + temp B-trees |
| Insights job titles: `WHERE country=? GROUP BY job_title` | `SEARCH USING INDEX ix_employee_country_job_title (country=?)`; grouping comes free from the index order, only the ORDER BY by average needs a sort | `SCAN employees` + `TEMP B-TREE FOR GROUP BY` + `TEMP B-TREE FOR ORDER BY` |

## Takeaways

- **At 10k rows the indexes barely change latency.** Filtered list queries get about 1.5–2.5 ms faster at p50. Everything else is within noise, because scanning 10k rows in SQLite takes about a millisecond and most of each request is HTTP, validation and JSON. The plans still show the indexes doing their job: filtered queries switch from `SCAN` to `SEARCH`, and the job-title breakdown skips a GROUP BY sort. That keeps cost proportional to the matching rows as the data grows.
- **Name search can't use an index.** `LIKE '%term%'` needs a scan. That's fine at 10k rows (about 8–9 ms). At much larger sizes, use SQLite FTS5 or a trigram index on Postgres.
- **The default sort uses a temp B-tree.** There's no index on `full_name`, so every unfiltered page sorts all rows. An index on `(full_name, id)` would remove that sort, but it isn't worth the write cost at 10k rows.
- **Deep pages cost more** (about 23 ms at page 400) because `OFFSET` walks past the skipped rows. Keyset pagination (`WHERE (full_name, id) > (?, ?)`) would fix this, at the cost of no "jump to page N". HR mostly uses search and filters, so offset pagination is kept.
- **`ix_employee_country` is redundant.** It's a prefix of `ix_employee_country_job_title`. It's kept because it's narrower for the per-country GROUP BY scan, but it's the first candidate to drop if write throughput mattered.
- **Per-country insights is the slowest aggregate (about 11 ms).** It still groups through a temp B-tree, because the GROUP BY is on `(country, currency)` and no index covers both. Currency is fully determined by country, so grouping by country alone would avoid that sort. That change isn't worth making at 10 rows of output.

## Why each phase opens a fresh connection

Prepared statements cached on a connection can keep a query plan from before `DROP INDEX`, which would make the with/without comparison show identical plans. To rule that out, each phase (seed, indexed, dropped indexes) opens its own connection and app.