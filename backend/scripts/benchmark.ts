/**
 * Measure seed time, endpoint latency and SQLite query plans on 10,000 employees.
 *
 * Run: npm run benchmark -w backend
 * Timings are in-process (Supertest against the Express app), so they exclude network and TLS.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { createApp } from '../src/app'
import { type Db, openDatabase } from '../src/db/client'
import { seedDatabase } from '../src/seed'

const SEED_RUNS = 3
const WARMUP = 5
const REQUESTS = 50
const INDEXES = ['ix_employee_country', 'ix_employee_job_title', 'ix_employee_country_job_title']

const SCENARIOS: Record<string, string> = {
  'List, default (page 1, sort by name)': '/api/employees',
  "List, search 'son'": '/api/employees?search=son',
  'List, filter country': '/api/employees?country=India',
  'List, filter country + job title': '/api/employees?country=India&job_title=Data%20Analyst',
  'List, sort salary desc': '/api/employees?sort=salary&order=desc',
  'List, deep page (page 400)': '/api/employees?page=400',
  'Insights, org summary': '/api/insights/summary',
  'Insights, per country': '/api/insights/countries',
  'Insights, job titles in a country': '/api/insights/countries/India/job-titles',
}

const EXPLAIN_SCENARIOS = [
  'List, filter country + job title',
  'List, default (page 1, sort by name)',
  'Insights, per country',
  'Insights, job titles in a country',
]

interface CapturedQuery {
  sql: string
  params: unknown[]
}

interface Result {
  p50: number
  p95: number
  plans: { sql: string; plan: string[] }[]
}

/** A fresh connection and app per phase, so no prepared statement outlives a schema change. */
function openPhase(file: string) {
  const captured: CapturedQuery[] = []
  let capturing = false
  const db = openDatabase(file, {
    logger: {
      logQuery(sql, params) {
        if (capturing && /^\s*select/i.test(sql)) captured.push({ sql, params })
      },
    },
  })
  const app = createApp({ db })
  async function capture(path: string): Promise<CapturedQuery[]> {
    captured.length = 0
    capturing = true
    await request(app).get(path).expect(200)
    capturing = false
    return [...captured]
  }
  return { db, app, capture }
}

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)] ?? Number.NaN
}

function queryPlan(db: Db, { sql, params }: CapturedQuery): string[] {
  const rows = db.$client.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as { detail: string }[]
  return rows.map((row) => row.detail)
}

async function runScenarios(file: string): Promise<Record<string, Result>> {
  const { db, app, capture } = openPhase(file)
  const results: Record<string, Result> = {}
  for (const [name, path] of Object.entries(SCENARIOS)) {
    for (let i = 0; i < WARMUP; i++) await request(app).get(path).expect(200)
    const samples: number[] = []
    for (let i = 0; i < REQUESTS; i++) {
      const started = performance.now()
      await request(app).get(path).expect(200)
      samples.push(performance.now() - started)
    }
    samples.sort((a, b) => a - b)
    const plans = EXPLAIN_SCENARIOS.includes(name)
      ? (await capture(path)).map((query) => ({ sql: query.sql, plan: queryPlan(db, query) }))
      : []
    results[name] = { p50: percentile(samples, 50), p95: percentile(samples, 95), plans }
  }
  db.$client.close()
  return results
}

function timeSeed(file: string): number[] {
  const db = openDatabase(file)
  const durations = Array.from({ length: SEED_RUNS }, () => {
    const started = performance.now()
    seedDatabase(db)
    return (performance.now() - started) / 1000
  })
  db.$client.close()
  return durations
}

function dropIndexes(file: string): void {
  const db = openDatabase(file)
  for (const index of INDEXES) db.$client.exec(`DROP INDEX ${index}`)
  db.$client.close()
}

function printReport(seed: number[], indexed: Record<string, Result>, bare: Record<string, Result>): void {
  const fmt = (n: number) => n.toFixed(1)
  console.log(`## Seed 10,000 employees (${SEED_RUNS} runs)\n`)
  console.log(seed.map((s) => `${s.toFixed(2)}s`).join(' / '), '\n')
  console.log(`## Latency, ${REQUESTS} requests each (ms)\n`)
  console.log('| Scenario | p50 indexed | p95 indexed | p50 no index | p95 no index |')
  console.log('|---|---:|---:|---:|---:|')
  for (const name of Object.keys(SCENARIOS)) {
    const a = indexed[name] as Result
    const b = bare[name] as Result
    console.log(`| ${name} | ${fmt(a.p50)} | ${fmt(a.p95)} | ${fmt(b.p50)} | ${fmt(b.p95)} |`)
  }
  for (const name of EXPLAIN_SCENARIOS) {
    console.log(`\n## Query plan: ${name}\n`)
    for (const [label, result] of [
      ['with indexes', indexed[name]],
      ['without indexes', bare[name]],
    ] as const) {
      console.log(`### ${label}\n`)
      for (const { sql, plan } of result?.plans ?? []) {
        console.log(`SQL: ${sql}`)
        for (const line of plan) console.log(`  ${line}`)
      }
      console.log()
    }
  }
}

async function main(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'acme-bench-'))
  const file = join(dir, 'bench.db')
  try {
    const seed = timeSeed(file)
    const indexed = await runScenarios(file)
    dropIndexes(file)
    const bare = await runScenarios(file)
    printReport(seed, indexed, bare)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

await main()