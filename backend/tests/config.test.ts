import { describe, expect, it } from 'vitest'
import { DEFAULT_DATABASE_FILE, DEFAULT_PORT, loadConfig } from '../src/config'

describe('loadConfig', () => {
  it('test_defaults_to_local_sqlite_file_port_8000_and_no_cors_origins', () => {
    expect(loadConfig({})).toEqual({ databaseFile: DEFAULT_DATABASE_FILE, port: DEFAULT_PORT, corsOrigins: [] })
  })

  it('test_reads_database_file_and_port_from_environment', () => {
    const config = loadConfig({ DATABASE_URL: '/var/data/salary.db', PORT: '10000' })

    expect([config.databaseFile, config.port]).toEqual(['/var/data/salary.db', 10_000])
  })

  it('test_parses_comma_separated_cors_origins_ignoring_blanks_and_trailing_slashes', () => {
    const config = loadConfig({ CORS_ORIGINS: ' https://a.example.com/ ,, http://localhost:5173 ' })

    expect(config.corsOrigins).toEqual(['https://a.example.com', 'http://localhost:5173'])
  })

  it.each(['abc', '0', '70000'])('test_rejects_invalid_port_%s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(/PORT/)
  })
})