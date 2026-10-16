import type { EmployeeInput, EmployeeQuery, FieldErrors } from './employee'

/** Response types of the HTTP API. Request shapes are inferred from the zod schemas. */

export interface Employee extends EmployeeInput {
  id: number
  created_at: string
  updated_at: string
}

export interface EmployeePage {
  items: Employee[]
  total: number
  page: number
  page_size: number
}

export type EmployeeQueryParams = Partial<EmployeeQuery>

export interface CountryOption {
  name: string
  currency: string
}

export interface Options {
  countries: CountryOption[]
  job_titles: string[]
  departments: string[]
}

export interface CountryStats {
  country: string
  currency: string
  headcount: number
  min_salary: number
  max_salary: number
  avg_salary: number
}

export interface JobTitleStats {
  job_title: string
  headcount: number
  avg_salary: number
}

export interface OrgSummary {
  headcount: number
  country_count: number
  department_count: number
}

export interface ApiErrorBody {
  error: {
    message: string
    fields?: FieldErrors
  }
}
