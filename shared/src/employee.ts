import { z } from 'zod'
import { COUNTRY_CURRENCY, isSupportedCountry } from './countries'

export type FieldErrors = Record<string, string>

export const MAX_SALARY_MINOR_UNITS = 10 ** 12
export const EARLIEST_HIRE_DATE = '1950-01-01'
export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
export const SORT_FIELDS = ['full_name', 'salary', 'hired_on', 'country', 'job_title'] as const
export const SORT_ORDERS = ['asc', 'desc'] as const

function requiredText(maxLength: number) {
  return z
    .string({ error: 'Required' })
    .trim()
    .min(1, { error: 'Required' })
    .max(maxLength, { error: `Must be at most ${maxLength} characters` })
}

const hireDate = z
  .string({ error: 'Required' })
  .min(1, { error: 'Required' })
  .pipe(z.iso.date({ error: 'Must be a date in YYYY-MM-DD format' }))
  .refine((value) => value >= EARLIEST_HIRE_DATE, {
    error: `Must be on or after ${EARLIEST_HIRE_DATE}`,
  })

/** Shape rules for an employee write. Business rules that need context live in employeeRuleErrors. */
export const employeeInputSchema = z.object({
  full_name: requiredText(200),
  job_title: requiredText(100),
  department: requiredText(100),
  country: requiredText(100),
  salary: z
    .number({ error: 'Must be a number' })
    .int({ error: 'Must be a whole number of minor units' })
    .positive({ error: 'Must be greater than 0' })
    .max(MAX_SALARY_MINOR_UNITS, { error: 'Amount is too large' }),
  currency: z
    .string({ error: 'Required' })
    .regex(/^[A-Z]{3}$/, { error: 'Must be a 3-letter uppercase ISO currency code' }),
  hired_on: hireDate,
})

export type EmployeeInput = z.output<typeof employeeInputSchema>

/** Rules that depend on the country list and today's date; shared by the API and the form. */
export function employeeRuleErrors(
  input: Pick<EmployeeInput, 'country' | 'currency' | 'hired_on'>,
  today: string,
): FieldErrors {
  const errors: FieldErrors = {}
  if (!isSupportedCountry(input.country)) {
    errors.country = 'Select a country'
  } else if (input.currency !== COUNTRY_CURRENCY[input.country]) {
    errors.currency = `Currency for ${input.country} must be ${COUNTRY_CURRENCY[input.country]}`
  }
  if (input.hired_on > today) errors.hired_on = 'Cannot be in the future'
  return errors
}

const optionalFilter = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: optionalFilter,
  country: optionalFilter,
  job_title: optionalFilter,
  department: optionalFilter,
  sort: z.enum(SORT_FIELDS).default('full_name'),
  order: z.enum(SORT_ORDERS).default('asc'),
})

export type EmployeeQuery = z.output<typeof employeeQuerySchema>
export type SortField = (typeof SORT_FIELDS)[number]
export type SortOrder = (typeof SORT_ORDERS)[number]

/** First message per top-level field, the shape the API returns and the form displays. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'body')
    errors[field] ??= issue.message
  }
  return errors
}
