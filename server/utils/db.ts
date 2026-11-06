import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

export { schema }

let _db: PostgresJsDatabase<typeof schema> | undefined

export function useDb() {
  if (!_db) {
    const url = useRuntimeConfig().databaseUrl
    if (!url) {
      throw new Error('NUXT_DATABASE_URL is not set')
    }
    _db = drizzle(postgres(url, { max: 10 }), { schema })
  }
  return _db
}
