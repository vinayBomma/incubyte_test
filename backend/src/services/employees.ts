import { type Employee, type EmployeeInput, employeeInputSchema, employeeRuleErrors, fieldErrorsOf } from '@acme/shared'
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
  }
}

export type EmployeeService = ReturnType<typeof createEmployeeService>