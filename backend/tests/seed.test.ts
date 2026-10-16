import { COUNTRY_CURRENCY, employeeInputSchema, employeeRuleErrors, toMinorUnits } from '@acme/shared'
import { count } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Db, openDatabase } from '../src/db/client'
import { employees } from '../src/db/schema'
import { SALARY_RANGES, generateEmployees, loadNames, seedDatabase, seedIfEmpty } from '../src/seed'
import { insertEmployees } from './factories'

let db: Db
beforeEach(() => {
  db = openDatabase(':memory:')
})
afterEach(() => db.$client.close())

function rowCount(): number {
  return db.select({ n: count() }).from(employees).get()?.n ?? 0
}

describe('seedDatabase', () => {
  it('test_seed_inserts_exactly_10000_employees', () => {
    seedDatabase(db, { count: 10_000, seed: 42 })

    expect(rowCount()).toBe(10_000)
  })

  it('test_seed_replaces_existing_data_when_rerun', () => {
    seedDatabase(db, { count: 50, seed: 1 })
    seedDatabase(db, { count: 50, seed: 1 })

    expect(rowCount()).toBe(50)
  })
})

describe('generateEmployees', () => {
  it('test_same_seed_generates_identical_employees', () => {
    expect(generateEmployees(500, 7)).toEqual(generateEmployees(500, 7))
  })

  it('test_different_seed_generates_different_employees', () => {
    expect(generateEmployees(500, 7)).not.toEqual(generateEmployees(500, 8))
  })

  it('test_salaries_fall_within_their_country_range', () => {
    for (const row of generateEmployees(2_000, 3)) {
      const [low, high] = SALARY_RANGES[row.country as keyof typeof SALARY_RANGES]
      expect(row.salary).toBeGreaterThanOrEqual(toMinorUnits(low, row.currency))
      expect(row.salary).toBeLessThanOrEqual(toMinorUnits(high, row.currency))
    }
  })

  it('test_every_supported_country_has_a_salary_range', () => {
    expect(Object.keys(SALARY_RANGES).sort()).toEqual(Object.keys(COUNTRY_CURRENCY).sort())
  })

  it('test_generated_rows_use_matching_currency_and_known_names', () => {
    const firstNames = new Set(loadNames('first_names.txt'))
    const lastNames = new Set(loadNames('last_names.txt'))

    for (const row of generateEmployees(500, 5)) {
      expect(row.currency).toBe(COUNTRY_CURRENCY[row.country as keyof typeof COUNTRY_CURRENCY])
      const [first, ...rest] = row.full_name.split(' ')
      expect(firstNames.has(first ?? '')).toBe(true)
      expect(lastNames.has(rest.join(' '))).toBe(true)
    }
  })

  it('test_salaries_are_integer_minor_units', () => {
    expect(generateEmployees(200, 9).every((row) => Number.isInteger(row.salary))).toBe(true)
  })

  it('test_generated_rows_pass_api_validation', () => {
    for (const row of generateEmployees(1_000, 11)) {
      const parsed = employeeInputSchema.parse(row)
      expect(employeeRuleErrors(parsed, '2026-06-30')).toEqual({})
    }
  })
})

describe('seedIfEmpty', () => {
  it('test_seed_if_empty_seeds_an_empty_database', () => {
    expect(seedIfEmpty(db, { count: 20, seed: 3 })).toBe(20)
    expect(rowCount()).toBe(20)
  })

  it('test_seed_if_empty_leaves_existing_data_untouched', () => {
    insertEmployees(db, { full_name: 'Kept By HR' })

    expect(seedIfEmpty(db, { count: 20, seed: 3 })).toBe(0)
    expect(db.select({ name: employees.full_name }).from(employees).all()).toEqual([{ name: 'Kept By HR' }])
  })
})