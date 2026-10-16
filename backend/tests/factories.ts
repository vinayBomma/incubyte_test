import type { EmployeeInput } from '@acme/shared'

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