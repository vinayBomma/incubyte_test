import type { EmployeeInput } from '@acme/shared'
import type { Db } from '../src/db/client'
import { type EmployeeRow, employees } from '../src/db/schema'

/** A valid JSON-ready employee body; override any field. */
export function employeePayload(overrides: Record<string, unknown> = {}): EmployeeInput {
  return {
    full_name: 'Asha Rao',
    job_title: 'Software Engineer',
    department: 'Engineering',
    country: 'India',
    salary: 250_000_000,
    currency: 'INR',
    hired_on: '2021-04-01',
    ...overrides,
  } as EmployeeInput
}

/** Insert one valid employee per overrides object, bypassing HTTP for speed. Ids follow argument order. */
export function insertEmployees(db: Db, ...overrides: Record<string, unknown>[]): EmployeeRow[] {
  const now = '2025-01-01T00:00:00.000Z'
  return overrides.map((o) =>
    db
      .insert(employees)
      .values({ ...employeePayload(o), created_at: now, updated_at: now })
      .returning()
      .get(),
  )
}
/** Tiny dataset with obvious answers: India n=3 min 100 max 500 avg 267; India Engineer avg 150.5 -> 151. */
export const INSIGHTS_DATASET = [
  { full_name: 'A', job_title: 'Engineer', department: 'Engineering', salary: 100, country: 'India', currency: 'INR' },
  { full_name: 'B', job_title: 'Engineer', department: 'Engineering', salary: 201, country: 'India', currency: 'INR' },
  { full_name: 'C', job_title: 'Manager', department: 'Sales', salary: 500, country: 'India', currency: 'INR' },
  { full_name: 'D', job_title: 'Engineer', department: 'Engineering', salary: 1000, country: 'Germany', currency: 'EUR' },
]