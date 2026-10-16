import type { Express } from 'express'
import { type AppDeps, createApp } from '../src/app'
import { type Db, openDatabase } from '../src/db/client'

export const TODAY = '2025-06-30'

export interface TestContext {
  app: Express
  db: Db
  close: () => void
}

/** Fresh in-memory database with migrations applied, and an app with a fixed clock. */
export function createTestContext(overrides: Partial<AppDeps> = {}): TestContext {
  const db = openDatabase(':memory:')
  const app = createApp({ db, today: () => TODAY, logError: () => {}, ...overrides })
  return { app, db, close: () => db.$client.close() }
}
