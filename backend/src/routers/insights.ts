import { Router } from 'express'
import type { InsightsService } from '../services/insights'

export function insightsRouter(service: InsightsService): Router {
  return Router()
    .get('/insights/summary', (_req, res) => {
      res.json(service.orgSummary())
    })
    .get('/insights/countries', (_req, res) => {
      res.json(service.countryStats())
    })
    .get('/insights/countries/:country/job-titles', (req, res) => {
      res.json(service.jobTitleStats(req.params.country))
    })
}