import { type CountryStats, type JobTitleStats, type OrgSummary, isSupportedCountry } from '@acme/shared'
import type { Db } from '../db/client'
import { NotFoundError } from '../errors'
import * as repo from '../repositories/insights'

/** Averages are reported in whole minor units; Math.round is half-up for the positive salaries we store. */
function roundAverage<T extends { avg_salary: number }>(row: T): T {
  return { ...row, avg_salary: Math.round(row.avg_salary) }
}

export function createInsightsService({ db }: { db: Db }) {
  return {
    countryStats(): CountryStats[] {
      return repo.countryStats(db).map(roundAverage)
    },

    jobTitleStats(country: string): JobTitleStats[] {
      if (!isSupportedCountry(country)) throw new NotFoundError(`Unsupported country: ${country}`)
      return repo.jobTitleStats(db, country).map(roundAverage)
    },

    orgSummary(): OrgSummary {
      return repo.orgSummary(db)
    },
  }
}

export type InsightsService = ReturnType<typeof createInsightsService>