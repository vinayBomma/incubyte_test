import type { CountryStats, Employee, EmployeePage, JobTitleStats, Options, OrgSummary } from '../api/types'

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    full_name: 'Ann Lee',
    job_title: 'Software Engineer',
    department: 'Engineering',
    country: 'United States',
    salary: 12_000_000,
    currency: 'USD',
    hired_on: '2020-01-15',
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    ...overrides,
  }
}

export function makePage(items: Employee[], overrides: Partial<EmployeePage> = {}): EmployeePage {
  return { items, total: items.length, page: 1, page_size: 25, ...overrides }
}

export const OPTIONS: Options = {
  countries: [
    { name: 'India', currency: 'INR' },
    { name: 'Japan', currency: 'JPY' },
    { name: 'United States', currency: 'USD' },
  ],
  job_titles: ['Data Analyst', 'Software Engineer'],
  departments: ['Engineering', 'Finance'],
}

export const ORG_SUMMARY: OrgSummary = { headcount: 10_000, country_count: 2, department_count: 9 }

export const COUNTRY_STATS: CountryStats[] = [
  { country: 'India', currency: 'INR', headcount: 3_000, min_salary: 50_000_000, max_salary: 600_000_000, avg_salary: 210_000_000 },
  { country: 'Japan', currency: 'JPY', headcount: 500, min_salary: 4_000_000, max_salary: 20_000_000, avg_salary: 8_500_000 },
]

export const JOB_TITLE_STATS: Record<string, JobTitleStats[]> = {
  India: [
    { job_title: 'Staff Engineer', headcount: 40, avg_salary: 450_000_000 },
    { job_title: 'Recruiter', headcount: 25, avg_salary: 120_000_000 },
  ],
  Japan: [{ job_title: 'Data Analyst', headcount: 12, avg_salary: 7_000_000 }],
}