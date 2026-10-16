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