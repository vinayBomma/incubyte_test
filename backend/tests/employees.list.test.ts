import { COUNTRY_CURRENCY, SORT_FIELDS } from '@acme/shared'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { insertEmployees } from './factories'
import { type TestContext, createTestContext } from './helpers'

let ctx: TestContext
beforeEach(() => {
  ctx = createTestContext()
})
afterEach(() => ctx.close())

async function list(query: Record<string, string | number | undefined> = {}) {
  return request(ctx.app).get('/api/employees').query(query)
}

function names(body: { items: { full_name: string }[] }): string[] {
  return body.items.map((item) => item.full_name)
}

function insertNumbered(count: number): void {
  insertEmployees(
    ctx.db,
    ...Array.from({ length: count }, (_, i) => ({ full_name: `Employee ${String(i + 1).padStart(2, '0')}` })),
  )
}

const numbered = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `Employee ${String(from + i).padStart(2, '0')}`)

describe('GET /api/employees pagination', () => {
  it('test_list_returns_first_page_of_25_with_total', async () => {
    insertNumbered(30)

    const { status, body } = await list()

    expect(status).toBe(200)
    expect([body.total, body.page, body.page_size]).toEqual([30, 1, 25])
    expect(names(body)).toEqual(numbered(1, 25))
  })

  it('test_list_returns_requested_page', async () => {
    insertNumbered(30)

    const { body } = await list({ page: 2, page_size: 10 })

    expect(names(body)).toEqual(numbered(11, 20))
  })

  it('test_list_returns_empty_items_beyond_last_page', async () => {
    insertNumbered(3)

    const { body } = await list({ page: 5 })

    expect([body.items, body.total]).toEqual([[], 3])
  })

  it.each([{ page: 0 }, { page_size: 0 }, { page_size: 101 }, { page: 'x' }])(
    'test_list_rejects_out_of_range_paging %j',
    async (query) => {
      const res = await list(query)

      expect(res.status).toBe(422)
      expect(Object.keys(res.body.error.fields)).toEqual(Object.keys(query))
    },
  )
})

describe('GET /api/employees search', () => {
  it('test_list_search_matches_name_substring_case_insensitively', async () => {
    insertEmployees(ctx.db, { full_name: 'Joanna Smith' }, { full_name: 'ANN Lee' }, { full_name: 'Bob Stone' })

    const { body } = await list({ search: 'ann' })

    expect([names(body), body.total]).toEqual([['ANN Lee', 'Joanna Smith'], 2])
  })

  it('test_list_search_ignores_blank_term', async () => {
    insertEmployees(ctx.db, { full_name: 'Ann Lee' }, { full_name: 'Bob Stone' })

    const { body } = await list({ search: '   ' })

    expect(body.total).toBe(2)
  })

  it('test_list_search_treats_wildcards_literally', async () => {
    insertEmployees(ctx.db, { full_name: 'Ann_Lee' }, { full_name: 'Bob Stone' }, { full_name: 'C\\D' })

    expect(names((await list({ search: '_' })).body)).toEqual(['Ann_Lee'])
    expect((await list({ search: '%' })).body.total).toBe(0)
    expect(names((await list({ search: '\\' })).body)).toEqual(['C\\D'])
  })
})

const FILTER_FIXTURES = [
  { full_name: 'Ann India Eng', country: 'India', currency: 'INR', job_title: 'Engineer', department: 'Engineering' },
  { full_name: 'Ben India Sales', country: 'India', currency: 'INR', job_title: 'Account Executive', department: 'Sales' },
  { full_name: 'Cara Germany Eng', country: 'Germany', currency: 'EUR', job_title: 'Engineer', department: 'Engineering' },
  { full_name: 'Dan Germany Eng', country: 'Germany', currency: 'EUR', job_title: 'Engineering Manager', department: 'Engineering' },
]

describe('GET /api/employees filters', () => {
  beforeEach(() => {
    insertEmployees(ctx.db, ...FILTER_FIXTURES)
  })

  it('test_list_filters_by_country', async () => {
    expect(names((await list({ country: 'India' })).body)).toEqual(['Ann India Eng', 'Ben India Sales'])
  })

  it('test_list_filters_by_job_title_exactly', async () => {
    expect(names((await list({ job_title: 'Engineer' })).body)).toEqual(['Ann India Eng', 'Cara Germany Eng'])
  })

  it('test_list_filters_by_department', async () => {
    expect(names((await list({ department: 'Sales' })).body)).toEqual(['Ben India Sales'])
  })

  it('test_list_combines_filters_and_search', async () => {
    const { body } = await list({ country: 'Germany', job_title: 'Engineer', search: 'eng' })

    expect([names(body), body.total]).toEqual([['Cara Germany Eng'], 1])
  })
})

describe('GET /api/employees sorting', () => {
  it('test_list_sorts_by_salary_descending', async () => {
    insertEmployees(ctx.db, { full_name: 'Low', salary: 100 }, { full_name: 'High', salary: 300 }, { full_name: 'Mid', salary: 200 })

    expect(names((await list({ sort: 'salary', order: 'desc' })).body)).toEqual(['High', 'Mid', 'Low'])
  })

  it('test_list_sorts_by_hire_date_ascending', async () => {
    insertEmployees(
      ctx.db,
      { full_name: 'B', hired_on: '2022-01-01' },
      { full_name: 'A', hired_on: '2023-01-01' },
      { full_name: 'C', hired_on: '2020-01-01' },
    )

    expect(names((await list({ sort: 'hired_on' })).body)).toEqual(['C', 'B', 'A'])
  })

  it('test_list_breaks_sort_ties_by_id', async () => {
    insertEmployees(ctx.db, { full_name: 'Zed', salary: 100 }, { full_name: 'Amy', salary: 100 }, { full_name: 'Max', salary: 100 })

    expect(names((await list({ sort: 'salary', order: 'desc' })).body)).toEqual(['Zed', 'Amy', 'Max'])
  })

  it.each([{ sort: 'id; DROP TABLE employees' }, { sort: 'created_at' }, { order: 'sideways' }])(
    'test_list_rejects_unknown_sort_or_order %j',
    async (query) => {
      expect((await list(query)).status).toBe(422)
    },
  )

  it.each(SORT_FIELDS)('test_list_accepts_declared_sort_field_%s', async (sort) => {
    expect((await list({ sort })).status).toBe(200)
  })
})

describe('GET /api/meta/options', () => {
  it('test_options_list_supported_countries_and_distinct_titles_and_departments', async () => {
    insertEmployees(
      ctx.db,
      { job_title: 'Engineer', department: 'Engineering' },
      { job_title: 'Analyst', department: 'Finance' },
      { job_title: 'Engineer', department: 'Engineering' },
    )

    const res = await request(ctx.app).get('/api/meta/options')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      countries: Object.entries(COUNTRY_CURRENCY)
        .map(([name, currency]) => ({ name, currency }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      job_titles: ['Analyst', 'Engineer'],
      departments: ['Engineering', 'Finance'],
    })
  })
})