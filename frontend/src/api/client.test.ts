import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createEmployee,
  deleteEmployee,
  getJobTitleStats,
  listEmployees,
  updateEmployee,
} from './client'

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('listEmployees', () => {
  it('sends only non-empty query params and returns the page', async () => {
    const page = { items: [], total: 0, page: 2, page_size: 25 }
    const fetchMock = mockFetch(200, page)

    const result = await listEmployees({ page: 2, search: 'ann', country: '', department: undefined })

    expect(result).toEqual(page)
    expect(fetchMock).toHaveBeenCalledWith('/api/employees?page=2&search=ann', expect.anything())
  })

  it('throws ApiError with field errors on 422', async () => {
    mockFetch(422, {
      error: { message: 'Please fix the highlighted fields.', fields: { salary: 'Must be greater than 0' } },
    })

    const error = await listEmployees({}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      message: 'Please fix the highlighted fields.',
      fieldErrors: { salary: 'Must be greater than 0' },
    })
  })

  it('throws ApiError with the server message on other errors', async () => {
    mockFetch(404, { error: { message: 'Employee 9 not found' } })

    await expect(listEmployees({})).rejects.toMatchObject({
      status: 404,
      message: 'Employee 9 not found',
      fieldErrors: {},
    })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })))

    await expect(listEmployees({})).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' })
  })
})

describe('employee mutations', () => {
  const input = {
    full_name: 'Ann Lee',
    job_title: 'Engineer',
    department: 'Engineering',
    country: 'India',
    salary: 150000000,
    currency: 'INR',
    hired_on: '2020-01-01',
  }

  it('creates with POST and a JSON body', async () => {
    const fetchMock = mockFetch(201, { id: 1, ...input })

    await createEmployee(input)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/employees',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })

  it('updates with PUT to the employee url', async () => {
    const fetchMock = mockFetch(200, { id: 7, ...input })

    await updateEmployee(7, input)

    expect(fetchMock).toHaveBeenCalledWith('/api/employees/7', expect.objectContaining({ method: 'PUT' }))
  })

  it('deletes and resolves on 204', async () => {
    const fetchMock = mockFetch(204, null)

    await expect(deleteEmployee(7)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/employees/7', expect.objectContaining({ method: 'DELETE' }))
  })
})
describe('getJobTitleStats', () => {
  it('url-encodes the country name', async () => {
    const fetchMock = mockFetch(200, [])

    await getJobTitleStats('United Kingdom')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/insights/countries/United%20Kingdom/job-titles',
      expect.anything(),
    )
  })
})

describe('request', () => {
  it('prefixes requests with VITE_API_BASE_URL, tolerating a trailing slash', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    const fetchMock = mockFetch(200, { items: [], total: 0, page: 1, page_size: 25 })

    await listEmployees({})

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/employees', expect.anything())
  })

  it('does not send Content-Type on GET, so cross-origin reads skip the CORS preflight', async () => {
    const fetchMock = mockFetch(200, { items: [], total: 0, page: 1, page_size: 25 })

    await listEmployees({})

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).has('Content-Type')).toBe(false)
  })

  it('sends Content-Type when there is a JSON body', async () => {
    const fetchMock = mockFetch(201, {})

    await createEmployee({
      full_name: 'A',
      job_title: 'B',
      department: 'C',
      country: 'India',
      salary: 1,
      currency: 'INR',
      hired_on: '2020-01-01',
    })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })
})
