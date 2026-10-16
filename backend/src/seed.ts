import { readFileSync } from 'node:fs'
import { COUNTRY_CURRENCY, type Country, type EmployeeInput, toMinorUnits } from '@acme/shared'
import type { Db } from './db/client'
import { employees } from './db/schema'

export const DEFAULT_COUNT = 10_000
export const DEFAULT_SEED = 42
const EARLIEST_HIRE = Date.UTC(2010, 0, 1)
const LATEST_HIRE = Date.UTC(2026, 5, 30) // fixed, not today, so output never depends on the clock
const DAY_MS = 86_400_000
const INSERT_CHUNK = 1_000 // keeps each statement well under SQLite's bound-parameter limit

/** Annual gross base pay in major units of the local currency: [entry level, top level]. */
export const SALARY_RANGES: Record<Country, readonly [number, number]> = {
  Australia: [60_000, 230_000],
  Brazil: [40_000, 400_000],
  Canada: [50_000, 220_000],
  France: [35_000, 150_000],
  Germany: [40_000, 170_000],
  India: [400_000, 6_000_000],
  Japan: [3_500_000, 20_000_000],
  Singapore: [40_000, 250_000],
  'United Kingdom': [30_000, 180_000],
  'United States': [50_000, 300_000],
}

const COUNTRY_WEIGHTS: readonly (readonly [Country, number])[] = [
  ['India', 30],
  ['United States', 20],
  ['United Kingdom', 10],
  ['Germany', 8],
  ['Canada', 7],
  ['Brazil', 7],
  ['France', 5],
  ['Australia', 5],
  ['Singapore', 4],
  ['Japan', 4],
]

interface Role {
  title: string
  department: string
  /** 0 = bottom of the country range, 1 = top. */
  level: number
  /** Relative headcount. */
  weight: number
}

const role = (title: string, department: string, level: number, weight: number): Role => ({
  title,
  department,
  level,
  weight,
})

const ROLES: readonly Role[] = [
  role('Software Engineer', 'Engineering', 0.35, 20),
  role('Senior Software Engineer', 'Engineering', 0.55, 12),
  role('Staff Engineer', 'Engineering', 0.75, 3),
  role('Engineering Manager', 'Engineering', 0.8, 3),
  role('QA Engineer', 'Engineering', 0.3, 5),
  role('Director of Engineering', 'Engineering', 0.95, 1),
  role('Product Manager', 'Product', 0.6, 4),
  role('Senior Product Manager', 'Product', 0.75, 2),
  role('Product Designer', 'Design', 0.45, 4),
  role('Data Analyst', 'Data', 0.35, 4),
  role('Data Scientist', 'Data', 0.55, 3),
  role('Sales Representative', 'Sales', 0.25, 8),
  role('Account Executive', 'Sales', 0.45, 5),
  role('Sales Manager', 'Sales', 0.65, 2),
  role('Marketing Specialist', 'Marketing', 0.3, 4),
  role('Marketing Manager', 'Marketing', 0.6, 2),
  role('Accountant', 'Finance', 0.3, 3),
  role('Financial Analyst', 'Finance', 0.4, 3),
  role('Finance Manager', 'Finance', 0.65, 1),
  role('Recruiter', 'People', 0.3, 3),
  role('HR Business Partner', 'People', 0.55, 2),
  role('Customer Support Specialist', 'Operations', 0.1, 8),
  role('Operations Manager', 'Operations', 0.6, 2),
]

const LEVEL_SPREAD = 0.08 // std-dev of pay around a role's level, as a fraction of the range

const nameCache = new Map<string, readonly string[]>()

export function loadNames(filename: string): readonly string[] {
  let names = nameCache.get(filename)
  if (!names) {
    const text = readFileSync(new URL(`../seed-data/${filename}`, import.meta.url), 'utf8')
    names = text
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
    nameCache.set(filename, names)
  }
  return names
}

/** Small seeded PRNG (mulberry32) so the same seed always yields the same rows. */
export class Random {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }

  int(maxInclusive: number): number {
    return Math.floor(this.next() * (maxInclusive + 1))
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length - 1)] as T
  }

  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0)
    let threshold = this.next() * total
    for (const item of items) {
      threshold -= weightOf(item)
      if (threshold < 0) return item
    }
    return items[items.length - 1] as T
  }

  /** Normal distribution via Box-Muller. */
  gauss(mean: number, stdDev: number): number {
    const u = 1 - this.next() // (0, 1] so log() is finite
    const v = this.next()
    return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}

function salaryMajor(rng: Random, country: Country, { level }: Role): number {
  const [low, high] = SALARY_RANGES[country]
  const position = Math.min(1, Math.max(0, rng.gauss(level, LEVEL_SPREAD)))
  return Math.round((low + (high - low) * position) / 100) * 100 // whole hundreds read like real offers
}

function hireDate(rng: Random): string {
  const days = rng.int((LATEST_HIRE - EARLIEST_HIRE) / DAY_MS)
  return new Date(EARLIEST_HIRE + days * DAY_MS).toISOString().slice(0, 10)
}

function generateEmployee(rng: Random): EmployeeInput {
  const [country] = rng.weighted(COUNTRY_WEIGHTS, ([, weight]) => weight)
  const job = rng.weighted(ROLES, (r) => r.weight)
  const currency = COUNTRY_CURRENCY[country]
  return {
    full_name: `${rng.pick(loadNames('first_names.txt'))} ${rng.pick(loadNames('last_names.txt'))}`,
    job_title: job.title,
    department: job.department,
    country,
    currency,
    salary: toMinorUnits(salaryMajor(rng, country, job), currency),
    hired_on: hireDate(rng),
  }
}

export function generateEmployees(count: number, seed: number): EmployeeInput[] {
  const rng = new Random(seed)
  return Array.from({ length: count }, () => generateEmployee(rng))
}

export interface SeedOptions {
  count?: number
  seed?: number
}

/** Replaces all employees with `count` generated rows in one transaction. Returns rows inserted. */
export function seedDatabase(db: Db, { count = DEFAULT_COUNT, seed = DEFAULT_SEED }: SeedOptions = {}): number {
  const now = new Date().toISOString()
  const rows = generateEmployees(count, seed).map((e) => ({ ...e, created_at: now, updated_at: now }))
  db.transaction((tx) => {
    tx.delete(employees).run()
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      tx.insert(employees).values(rows.slice(i, i + INSERT_CHUNK)).run()
    }
  })
  return count
}

/** Seed only a brand-new database so a restart never overwrites HR edits. Returns rows inserted. */
export function seedIfEmpty(db: Db, options: SeedOptions = {}): number {
  const existing = db.select({ id: employees.id }).from(employees).limit(1).get()
  return existing ? 0 : seedDatabase(db, options)
}