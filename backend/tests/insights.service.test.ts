import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Db, openDatabase } from '../src/db/client'
import { NotFoundError } from '../src/errors'
import { type InsightsService, createInsightsService } from '../src/services/insights'
import { INSIGHTS_DATASET, insertEmployees } from './factories'

let db: Db
let service: InsightsService
beforeEach(() => {
  db = openDatabase(':memory:')
  service = createInsightsService({ db })
})
afterEach(() => db.$client.close())

describe('InsightsService', () => {
  it('test_country_stats_aggregates_each_country', () => {
    insertEmployees(db, ...INSIGHTS_DATASET)

    expect(service.countryStats()).toEqual([
      { country: 'Germany', currency: 'EUR', headcount: 1, min_salary: 1000, max_salary: 1000, avg_salary: 1000 },
      { country: 'India', currency: 'INR', headcount: 3, min_salary: 100, max_salary: 500, avg_salary: 267 },
    ])
  })

  it('test_job_title_stats_within_country_sorted_by_average_desc', () => {
    insertEmployees(db, ...INSIGHTS_DATASET)

    expect(service.jobTitleStats('India')).toEqual([
      { job_title: 'Manager', headcount: 1, avg_salary: 500 },
      { job_title: 'Engineer', headcount: 2, avg_salary: 151 }, // 150.5 rounds half-up
    ])
  })

  it('test_job_title_stats_breaks_average_ties_by_title', () => {
    insertEmployees(
      db,
      { job_title: 'Zoologist', salary: 300 },
      { job_title: 'Analyst', salary: 300 },
    )

    expect(service.jobTitleStats('India').map((row) => row.job_title)).toEqual(['Analyst', 'Zoologist'])
  })

  it('test_job_title_stats_empty_for_supported_country_without_employees', () => {
    insertEmployees(db, ...INSIGHTS_DATASET)

    expect(service.jobTitleStats('Japan')).toEqual([])
  })

  it('test_job_title_stats_rejects_unsupported_country', () => {
    expect(() => service.jobTitleStats('Atlantis')).toThrow(NotFoundError)
  })

  it('test_org_summary_counts_people_countries_and_departments', () => {
    insertEmployees(db, ...INSIGHTS_DATASET)

    expect(service.orgSummary()).toEqual({ headcount: 4, country_count: 2, department_count: 2 })
  })

  it('test_org_summary_is_zero_for_empty_org', () => {
    expect(service.orgSummary()).toEqual({ headcount: 0, country_count: 0, department_count: 0 })
  })
})