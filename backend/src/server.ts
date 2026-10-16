import { createApp } from './app'
import { openDatabase } from './db/client'

const port = Number(process.env.PORT ?? 8000)
const db = openDatabase(process.env.DATABASE_URL ?? 'salary.db')

createApp({ db }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
