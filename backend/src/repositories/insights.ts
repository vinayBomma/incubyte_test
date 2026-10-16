import { asc, count, countDistinct, desc, eq, max, min, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { employees } from '../db/schema'

// Drizzle's avg() returns a string; raw AVG keeps the float so the service can round it.
const avgSalary = sql<number>`avg(${employees.salary})`

export interface CountryStatsRow {
  country: string
  currency: string
  headcount: number
  min_salary: number
  max_salary: number
  avg_salary: number
}

export interface JobTitleStatsRow {
  job_title: string
  headcount: number
  avg_salary: number
}

export function countryStats(db: Db): CountryStatsRow[] {
  return db
    .select({
      country: employees.country,
      currency: employees.currency,
      headcount: count(),
      min_salary: sql<number>`${min(employees.salary)}`,
      max_salary: sql<number>`${max(employees.salary)}`,
      avg_salary: avgSalary,
    })
    .from(employees)
    .groupBy(employees.country, employees.currency)
    .orderBy(asc(employees.country))
    .all()
}

export function jobTitleStats(db: Db, country: string): JobTitleStatsRow[] {
  return db
    .select({ job_title: employees.job_title, headcount: count(), avg_salary: avgSalary })
    .from(employees)
    .where(eq(employees.country, country))
    .groupBy(employees.job_title)
    .orderBy(desc(avgSalary), asc(employees.job_title))
    .all()
}

export function orgSummary(db: Db): { headcount: number; country_count: number; department_count: number } {
  return db
    .select({
      headcount: count(),
      country_count: countDistinct(employees.country),
      department_count: countDistinct(employees.department),
    })
    .from(employees)
    .get() ?? { headcount: 0, country_count: 0, department_count: 0 }
}