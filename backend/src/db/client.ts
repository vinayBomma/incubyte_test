import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import type { Logger } from 'drizzle-orm'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

export interface OpenOptions {
  /** Sees every SQL statement Drizzle runs; the benchmark uses it to EXPLAIN real queries. */
  logger?: Logger
}

/** Opens (or creates) the SQLite file, or ':memory:', and brings the schema up to date. */
export function openDatabase(filename: string, { logger }: OpenOptions = {}): Db {
  const sqlite = new Database(filename)
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle({ client: sqlite, schema, ...(logger ? { logger } : {}) })
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return db
}
