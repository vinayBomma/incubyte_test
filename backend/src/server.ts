import { createApp } from './app'
import { loadConfig } from './config'
import { openDatabase } from './db/client'
import { seedIfEmpty } from './seed'

const config = loadConfig(process.env)
const db = openDatabase(config.databaseFile)

const seeded = seedIfEmpty(db)
if (seeded > 0) console.log(`Seeded ${seeded.toLocaleString('en-US')} employees into an empty database`)

createApp({ db, corsOrigins: config.corsOrigins }).listen(config.port, () => {
  console.log(`API listening on port ${config.port}`)
})