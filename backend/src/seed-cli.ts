/** `npm run seed -w backend -- [--count N] [--seed S]`: replaces all employees with deterministic data. */
import { parseArgs } from 'node:util'
import { openDatabase } from './db/client'
import { DEFAULT_COUNT, DEFAULT_SEED, seedDatabase } from './seed'

const { values } = parseArgs({
  options: {
    count: { type: 'string', default: String(DEFAULT_COUNT) },
    seed: { type: 'string', default: String(DEFAULT_SEED) },
  },
})

const db = openDatabase(process.env.DATABASE_URL ?? 'salary.db')
const started = performance.now()
const inserted = seedDatabase(db, { count: Number(values.count), seed: Number(values.seed) })
const seconds = (performance.now() - started) / 1000
console.log(`Seeded ${inserted.toLocaleString('en-US')} employees in ${seconds.toFixed(2)}s`)
db.$client.close()