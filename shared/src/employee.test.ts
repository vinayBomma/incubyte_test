import { describe, expect, it } from 'vitest'
import {
  type EmployeeInput,
  employeeInputSchema,
  employeeQuerySchema,
  employeeRuleErrors,
  fieldErrorsOf,
} from './employee'

const valid: EmployeeInput = {
  full_name: 'Ann Lee',
  job_title: 'Software Engineer',
  department: 'Engineering',
  country: 'India',
  salary: 150_000_000,
  currency: 'INR',
  hired_on: '2020-01-15',
}

function shapeErrors(overrides: Record<string, unknown>): Record<string, string> {
  const result = employeeInputSchema.safeParse({ ...valid, ...overrides })
  return result.success ? {} : fieldErrorsOf(result.error)
}

describe('employeeInputSchema', () => {
  it('accepts a valid employee and trims text fields', () => {
    const parsed = employeeInputSchema.parse({ ...valid, full_name: '  Ann Lee ' })

    expect(parsed).toEqual(valid)
  })

  it.each<[Record<string, unknown>, string, RegExp]>([
    [{ full_name: '   ' }, 'full_name', /required/i],
    [{ full_name: 'x'.repeat(201) }, 'full_name', /200 characters/i],
    [{ job_title: undefined }, 'job_title', /required/i],
    [{ department: 'x'.repeat(101) }, 'department', /100 characters/i],
    [{ country: '' }, 'country', /required/i],
    [{ salary: 0 }, 'salary', /greater than 0/i],
    [{ salary: 10.5 }, 'salary', /whole number of minor units/i],
    [{ salary: '100' }, 'salary', /number/i],
    [{ salary: 10 ** 12 + 1 }, 'salary', /too large/i],
    [{ currency: 'inr' }, 'currency', /3-letter/i],
    [{ hired_on: '15/01/2020' }, 'hired_on', /YYYY-MM-DD/],
    [{ hired_on: '2020-02-30' }, 'hired_on', /YYYY-MM-DD/],
    [{ hired_on: '1949-12-31' }, 'hired_on', /1950/],
  ])('rejects %j on %s', (overrides, field, message) => {
    expect(shapeErrors(overrides)[field]).toMatch(message)
  })

  it('drops unknown fields such as id', () => {
    expect(employeeInputSchema.parse({ ...valid, id: 7 })).not.toHaveProperty('id')
  })
})

describe('employeeRuleErrors', () => {
  const today = '2025-06-30'

  it('returns no errors for a consistent employee', () => {
    expect(employeeRuleErrors(valid, today)).toEqual({})
  })

  it('rejects an unsupported country', () => {
    expect(employeeRuleErrors({ ...valid, country: 'Atlantis' }, today)).toEqual({
      country: 'Select a country',
    })
  })

  it('rejects a currency that does not match the country', () => {
    expect(employeeRuleErrors({ ...valid, currency: 'USD' }, today)).toEqual({
      currency: 'Currency for India must be INR',
    })
  })

  it('rejects a hire date in the future but accepts today', () => {
    expect(employeeRuleErrors({ ...valid, hired_on: '2025-07-01' }, today)).toEqual({
      hired_on: 'Cannot be in the future',
    })
    expect(employeeRuleErrors({ ...valid, hired_on: today }, today)).toEqual({})
  })
})

describe('employeeQuerySchema', () => {
  it('applies defaults to an empty query', () => {
    expect(employeeQuerySchema.parse({})).toEqual({
      page: 1,
      page_size: 25,
      sort: 'full_name',
      order: 'asc',
    })
  })

  it('coerces numeric strings and treats blank filters as absent', () => {
    expect(
      employeeQuerySchema.parse({ page: '3', page_size: '50', search: '  ', country: '' }),
    ).toEqual({ page: 3, page_size: 50, sort: 'full_name', order: 'asc' })
  })

  it.each([
    [{ page: '0' }, 'page'],
    [{ page_size: '101' }, 'page_size'],
    [{ page: 'abc' }, 'page'],
    [{ sort: 'password' }, 'sort'],
    [{ order: 'sideways' }, 'order'],
  ])('rejects %j', (query, field) => {
    const result = employeeQuerySchema.safeParse(query)

    expect(result.success).toBe(false)
    expect(fieldErrorsOf(result.error!)).toHaveProperty(field)
  })
})
