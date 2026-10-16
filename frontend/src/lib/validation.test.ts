import { describe, expect, it } from 'vitest'
import { OPTIONS } from '../test/fixtures'
import { type EmployeeFormValues, validateEmployee } from './validation'

const TODAY = '2025-06-30'

const valid: EmployeeFormValues = {
  full_name: '  Ann Lee ',
  job_title: 'Software Engineer',
  department: 'Engineering',
  country: 'Japan',
  salary: '9000000',
  hired_on: '2020-01-15',
}

function errorsFor(overrides: Partial<EmployeeFormValues>) {
  const result = validateEmployee({ ...valid, ...overrides }, OPTIONS.countries, TODAY)
  return result.ok ? {} : result.errors
}

describe('validateEmployee', () => {
  it('returns a trimmed payload with minor units and the country currency', () => {
    expect(validateEmployee(valid, OPTIONS.countries, TODAY)).toEqual({
      ok: true,
      input: {
        full_name: 'Ann Lee',
        job_title: 'Software Engineer',
        department: 'Engineering',
        country: 'Japan',
        salary: 9_000_000,
        currency: 'JPY',
        hired_on: '2020-01-15',
      },
    })
  })

  it.each<[Partial<EmployeeFormValues>, keyof EmployeeFormValues, RegExp]>([
    [{ full_name: '   ' }, 'full_name', /required/i],
    [{ full_name: 'x'.repeat(201) }, 'full_name', /200 characters/i],
    [{ job_title: '' }, 'job_title', /required/i],
    [{ department: 'x'.repeat(101) }, 'department', /100 characters/i],
    [{ country: '' }, 'country', /select a country/i],
    [{ country: 'Atlantis' }, 'country', /select a country/i],
    [{ salary: '' }, 'salary', /amount/i],
    [{ salary: '0' }, 'salary', /greater than 0/i],
    [{ salary: '1.5' }, 'salary', /whole number/i],
    [{ country: 'India', salary: '1.555' }, 'salary', /2 decimal/i],
    [{ salary: '1000000000001' }, 'salary', /too large/i],
    [{ hired_on: '' }, 'hired_on', /required/i],
    [{ hired_on: '1949-12-31' }, 'hired_on', /1950/],
    [{ hired_on: '2025-07-01' }, 'hired_on', /future/i],
  ])('rejects %j on %s', (overrides, field, message) => {
    expect(errorsFor(overrides)[field]).toMatch(message)
  })

  it('accepts a hire date of today', () => {
    expect(errorsFor({ hired_on: TODAY })).toEqual({})
  })
})
