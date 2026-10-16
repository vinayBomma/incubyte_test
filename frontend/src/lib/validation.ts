import { employeeInputSchema, employeeRuleErrors, fieldErrorsOf } from '@acme/shared'
import type { CountryOption, EmployeeInput, FieldErrors } from '../api/types'
import { minorDigits, toMinorUnits } from './money'

export interface EmployeeFormValues {
  full_name: string
  job_title: string
  department: string
  country: string
  salary: string
  hired_on: string
}

export type ValidationResult = { ok: true; input: EmployeeInput } | { ok: false; errors: FieldErrors }

/** The form takes salary as a major-unit string; only parsing it is form-specific. Range rules are shared. */
function salaryParseError(input: string, currency: string): string {
  if (!input.trim()) return 'Enter an amount'
  const digits = minorDigits(currency)
  if (digits === 0) return `Enter a whole number (${currency} has no decimals)`
  return `Enter a number with at most ${digits} decimal places`
}

/**
 * Runs the same zod schema and business rules as the API (from @acme/shared) for instant feedback.
 * The server stays authoritative and its 422 field errors are shown the same way.
 */
export function validateEmployee(
  values: EmployeeFormValues,
  countries: CountryOption[],
  today: string,
): ValidationResult {
  const currency = countries.find((option) => option.name === values.country)?.currency
  const salary = currency ? toMinorUnits(values.salary, currency) : null
  const candidate = { ...values, currency: currency ?? '', salary: salary ?? undefined }
  const parsed = employeeInputSchema.safeParse(candidate)
  const errors: FieldErrors = {
    ...employeeRuleErrors(candidate, today),
    ...(parsed.success ? {} : fieldErrorsOf(parsed.error)),
  }

  delete errors.currency // derived from the country, so never shown as its own field
  if (!currency) {
    errors.country = 'Select a country'
    delete errors.salary // can't judge an amount until we know its currency
  } else if (salary === null) {
    errors.salary = salaryParseError(values.salary, currency)
  }

  if (parsed.success && Object.keys(errors).length === 0) return { ok: true, input: parsed.data }
  return { ok: false, errors }
}