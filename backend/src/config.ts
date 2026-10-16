export const DEFAULT_DATABASE_FILE = 'salary.db'
export const DEFAULT_PORT = 8000

export interface Config {
  /** SQLite file path (or ':memory:'). */
  databaseFile: string
  port: number
  /** Exact origins allowed to call the API from a browser; empty means same-origin only. */
  corsOrigins: string[]
}

type Env = Record<string, string | undefined>

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${raw}"`)
  }
  return port
}

function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

export function loadConfig(env: Env): Config {
  return {
    databaseFile: env.DATABASE_URL || DEFAULT_DATABASE_FILE,
    port: parsePort(env.PORT),
    corsOrigins: parseOrigins(env.CORS_ORIGINS),
  }
}