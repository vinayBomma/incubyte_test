import express, { type Express } from 'express'
import type { Db } from './db/client'
import { type ErrorLogger, errorHandler, unknownRoute } from './http/errors'
import { employeesRouter } from './routers/employees'
import { healthRouter } from './routers/health'
import { createEmployeeService } from './services/employees'

export interface AppDeps {
  db: Db
  /** Today's date as YYYY-MM-DD; injected so tests never depend on the real clock. */
  today?: () => string
  /** Current timestamp as ISO 8601 UTC; injected so tests can pin created_at/updated_at. */
  now?: () => string
  logError?: ErrorLogger
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createApp({ db, today = utcToday, now, logError = console.error }: AppDeps): Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))

  const api = express.Router()
  api.use(healthRouter())
  api.use(employeesRouter(createEmployeeService({ db, today, now })))
  app.use('/api', api)

  app.use(unknownRoute)
  app.use(errorHandler(logError))
  return app
}
