/**
 * Baseline data for a local database: three packages, one regular user and
 * one admin. Safe to re-run:
 * - packages are added only when missing (a price edited in Admin stays);
 * - accounts are created, or get their role and password reset, so the
 *   credentials printed at the end always work.
 *
 *   bun run db:seed
 *
 * Passwords can be set with SEED_USER_PASSWORD / SEED_ADMIN_PASSWORD.
 * Refuses to run when NODE_ENV=production unless SEED_FORCE=1, and then only
 * with both passwords set (never ship an admin with a password from this file).
 */
import { hashPassword } from 'better-auth/crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema'

// Placeholder pricing (whole rupiah): adjust here or later in Admin → Paket.
const PACKAGES = [
  { name: 'Bulanan', description: 'Akses penuh ruang kerja selama 30 hari.', price: 25_000, durationDays: 30 },
  { name: 'Triwulan', description: 'Akses penuh selama 90 hari, satu periode penilaian triwulanan.', price: 65_000, durationDays: 90 },
  { name: 'Tahunan', description: 'Akses penuh selama 365 hari, satu tahun SKP.', price: 225_000, durationDays: 365 }
]

const ACCOUNTS = [
  { name: 'Budi Santoso', email: 'user@ruangkerja.io', role: 'user', password: process.env.SEED_USER_PASSWORD ?? 'user-ruangkerja-2026' },
  { name: 'Admin Ruang Kerja', email: 'admin@ruangkerja.io', role: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'admin-ruangkerja-2026' }
] as const

if (process.env.NODE_ENV === 'production') {
  if (process.env.SEED_FORCE !== '1') {
    console.error('Menolak seed di production (set SEED_FORCE=1 untuk memaksa).')
    process.exit(1)
  }
  if (!process.env.SEED_USER_PASSWORD || !process.env.SEED_ADMIN_PASSWORD) {
    console.error('Di production, SEED_USER_PASSWORD dan SEED_ADMIN_PASSWORD wajib diisi.')
    process.exit(1)
  }
}
const url = process.env.NUXT_DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL wajib diisi.')
  process.exit(1)
}
for (const a of ACCOUNTS) {
  // Same bounds as Better Auth's emailAndPassword config (server/utils/auth.ts).
  if (a.password.length < 8 || a.password.length > 128) {
    console.error(`Kata sandi ${a.email} harus 8–128 karakter.`)
    process.exit(1)
  }
}

const client = postgres(url, { max: 1 })
const db = drizzle(client, { schema })

await db.transaction(async (tx) => {
  console.log('Paket:')
  for (const p of PACKAGES) {
    const [existing] = await tx.select().from(schema.packages)
      .where(and(eq(schema.packages.name, p.name), isNull(schema.packages.deletedAt)))
    if (existing) {
      console.log(`  = ${existing.name}: Rp${existing.price.toLocaleString('id-ID')} / ${existing.durationDays} hari (sudah ada, tidak diubah)`)
      continue
    }
    await tx.insert(schema.packages).values({ ...p, isActive: true })
    console.log(`  + ${p.name}: Rp${p.price.toLocaleString('id-ID')} / ${p.durationDays} hari`)
  }

  console.log('Akun:')
  for (const a of ACCOUNTS) {
    // Mirrors Better Auth's email sign-up: a users row plus a "credential" account holding the hash.
    const [existing] = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, a.email))
    let userId = existing?.id
    if (userId) {
      await tx.update(schema.users).set({ role: a.role, emailVerified: true }).where(eq(schema.users.id, userId))
    } else {
      const [created] = await tx.insert(schema.users)
        .values({ name: a.name, email: a.email, emailVerified: true, role: a.role })
        .returning({ id: schema.users.id })
      userId = created!.id
    }

    const password = await hashPassword(a.password)
    const updated = await tx.update(schema.accounts).set({ password })
      .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, 'credential')))
      .returning({ id: schema.accounts.id })
    if (!updated.length) {
      await tx.insert(schema.accounts).values({ userId, accountId: userId, providerId: 'credential', password })
    }
    console.log(`  ${existing ? '=' : '+'} ${a.role.padEnd(5)} ${a.email} / ${a.password}`)
  }
})

await client.end()
console.log('Selesai. Pengguna belum punya paket: setelah masuk diarahkan ke /subscription. Admin: buka /admin.')
