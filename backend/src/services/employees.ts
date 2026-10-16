import {
  COUNTRY_CURRENCY,
  type Employee,
  type EmployeeInput,
  type EmployeePage,
  type Options,
  employeeInputSchema,
  employeeQuerySchema,
  employeeRuleErrors,
  fieldErrorsOf,
} from '@acme/shared'
import type { Db } from '../db/client'
import { DomainValidationError, NotFoundError } from '../errors'
import * as repo from '../repositories/employees'

export interface EmployeeServiceDeps {
  db: Db
  today: () => string
  now?: () => string
}

function notFound(id: number): NotFoundError {
  return new NotFoundError(`Employee ${id} not found`)
}

function found<T>(id: number, value: T | undefined): T {
  if (value === undefined) throw notFound(id)
  return value
}

export function createEmployeeService({ db, today, now = () => new Date().toISOString() }: EmployeeServiceDeps) {
  function validate(body: unknown): EmployeeInput {
    const parsed = employeeInputSchema.safeParse(body)
    if (!parsed.success) throw new DomainValidationError(fieldErrorsOf(parsed.error))
    const ruleErrors = employeeRuleErrors(parsed.data, today())
    if (Object.keys(ruleErrors).length > 0) throw new DomainValidationError(ruleErrors)
    return parsed.data
  }

  return {
    create(body: unknown): Employee {
      return repo.insertEmployee(db, validate(body), now())
    },

    get(id: number): Employee {
      return found(id, repo.findEmployee(db, id))
    },

    update(id: number, body: unknown): Employee {
      return found(id, repo.updateEmployee(db, id, validate(body), now()))
    },

    delete(id: number): void {
      if (!repo.deleteEmployee(db, id)) throw notFound(id)
    },

    list(params: unknown): EmployeePage {
      const parsed = employeeQuerySchema.safeParse(params)
      if (!parsed.success) {
        throw new DomainValidationError(fieldErrorsOf(parsed.error), 'Invalid list parameters.')
      }
      const query = parsed.data
      return { ...repo.listEmployees(db, query), page: query.page, page_size: query.page_size }
    },

    options(): Options {
      return {
        countries: Object.entries(COUNTRY_CURRENCY)
          .map(([name, currency]) => ({ name, currency }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        job_titles: repo.distinctJobTitles(db),
        departments: repo.distinctDepartments(db),
      }
    },
  }
}

export type EmployeeService = ReturnType<typeof createEmployeeService>