import type {
  ApiErrorBody,
  CountryStats,
  Employee,
  EmployeeInput,
  EmployeePage,
  EmployeeQuery,
  FieldErrors,
  JobTitleStats,
  Options,
  OrgSummary,
} from './types'

/** Empty in dev (Vite proxies /api); the Render URL in production builds. Read per call so tests can stub it. */
function apiBase(): string {
  return `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')}/api`
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const error = (body as Partial<ApiErrorBody> | null)?.error
  if (typeof error?.message !== 'string') return new ApiError(status, `Request failed (${status})`)
  return new ApiError(status, error.message, error.fields)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Only writes carry JSON; a Content-Type on GET would force a CORS preflight per request.
  const headers = init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers })
  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw toApiError(response.status, body)
  return body as T
}

function toQueryString(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function listEmployees(query: EmployeeQuery): Promise<EmployeePage> {
  return request(`/employees${toQueryString(query)}`)
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return request('/employees', { method: 'POST', body: JSON.stringify(input) })
}

export function updateEmployee(id: number, input: EmployeeInput): Promise<Employee> {
  return request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteEmployee(id: number): Promise<void> {
  return request(`/employees/${id}`, { method: 'DELETE' })
}

export function getOptions(): Promise<Options> {
  return request('/meta/options')
}

export function getOrgSummary(): Promise<OrgSummary> {
  return request('/insights/summary')
}

export function getCountryStats(): Promise<CountryStats[]> {
  return request('/insights/countries')
}

export function getJobTitleStats(country: string): Promise<JobTitleStats[]> {
  return request(`/insights/countries/${encodeURIComponent(country)}/job-titles`)
}