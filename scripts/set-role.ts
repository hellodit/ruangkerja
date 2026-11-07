/**
 * Grant or revoke the admin panel (users.role). The role can never be set
 * through the app or the API, only with this script.
 *
 *   NUXT_DATABASE_URL=… bun scripts/set-role.ts <email> [admin|user]
 */
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema'

const email = process.argv[2]?.trim().toLowerCase()
const role = process.argv[3] ?? 'admin'
const url = process.env.NUXT_DATABASE_URL
if (!email || (role !== 'admin' && role !== 'user')) {
  console.error('Pemakaian: bun scripts/set-role.ts <email> [admin|user]')
  process.exit(1)
}
if (!url) {
  console.error('NUXT_DATABASE_URL wajib diisi.')
  process.exit(1)
}

const client = postgres(url, { max: 1 })
const db = drizzle(client, { schema })
const [row] = await db.update(schema.users).set({ role }).where(eq(schema.users.email, email))
  .returning({ id: schema.users.id, name: schema.users.name, role: schema.users.role })
await client.end()

if (!row) {
  console.error(`Tidak ada akun dengan email ${email}.`)
  process.exit(1)
}
console.log(`${row.name} <${email}> sekarang ${row.role === 'admin' ? 'admin' : 'pengguna biasa'}.`)
