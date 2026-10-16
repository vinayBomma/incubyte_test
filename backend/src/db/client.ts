import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

/** Opens (or creates) the SQLite file, or ':memory:', and brings the schema up to date. */
export function openDatabase(filename: string): Db {
  const sqlite = new Database(filename)
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle({ client: sqlite, schema })
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return db
}
