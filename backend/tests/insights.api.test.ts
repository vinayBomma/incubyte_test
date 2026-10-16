import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INSIGHTS_DATASET, insertEmployees } from './factories'
import { type TestContext, createTestContext } from './helpers'

let ctx: TestContext
beforeEach(() => {
  ctx = createTestContext()
})
afterEach(() => ctx.close())

describe('insights API', () => {
  it('test_summary_endpoint', async () => {
    insertEmployees(ctx.db, ...INSIGHTS_DATASET)

    const res = await request(ctx.app).get('/api/insights/summary')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ headcount: 4, country_count: 2, department_count: 2 })
  })

  it('test_countries_endpoint', async () => {
    insertEmployees(ctx.db, ...INSIGHTS_DATASET)

    const res = await request(ctx.app).get('/api/insights/countries')

    expect(res.status).toBe(200)
    expect(res.body.map((c: { country: string; headcount: number; avg_salary: number }) => [c.country, c.headcount, c.avg_salary])).toEqual([
      ['Germany', 1, 1000],
      ['India', 3, 267],
    ])
  })

  it('test_job_titles_endpoint', async () => {
    insertEmployees(ctx.db, ...INSIGHTS_DATASET)

    const res = await request(ctx.app).get('/api/insights/countries/India/job-titles')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { job_title: 'Manager', headcount: 1, avg_salary: 500 },
      { job_title: 'Engineer', headcount: 2, avg_salary: 151 },
    ])
  })

  it('test_job_titles_endpoint_handles_country_names_with_spaces', async () => {
    insertEmployees(ctx.db, { country: 'United States', currency: 'USD', job_title: 'PM' })

    const res = await request(ctx.app).get('/api/insights/countries/United%20States/job-titles')

    expect(res.body.map((row: { job_title: string }) => row.job_title)).toEqual(['PM'])
  })

  it('test_job_titles_endpoint_returns_404_for_unsupported_country', async () => {
    const res = await request(ctx.app).get('/api/insights/countries/Atlantis/job-titles')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { message: 'Unsupported country: Atlantis' } })
  })
})