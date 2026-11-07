import { desc, eq, sql } from 'drizzle-orm'

type SettingsInput = ReturnType<typeof import('#shared/schemas/workspace').settingsSchema.parse>

type SkpColumns = typeof schema.skps._.columns

/** Current year's SKP first, else the most recent one (relational `orderBy`). */
const activeSkpFirst = (today: string) => (s: SkpColumns) => [desc(sql`${s.year} = ${Number(today.slice(0, 4))}`), desc(s.year)]

/** Live RHKs of an SKP (correlated count). */
const rhkCountOf = (s: SkpColumns) =>
  sql<number>`(select count(*)::int from rhks r where r.skp_id = ${s.id} and r.deleted_at is null)`.as('rhk_count')

/**
 * Shell data for /api/me (every page load): profile title, active SKP with
 * its periods and RHK count, paid coverage and the evidence-link count, in a
 * single relational query.
 */
export async function getShellData(userId: string, today: string, now = new Date()) {
  const row = await useDb().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true },
    extras: u => ({
      evidenceCount: sql<number>`(select count(*)::int from progress_results r
        join daily_progress dp on dp.id = r.progress_id
        where dp.user_id = ${u.id} and dp.deleted_at is null and r.evidence_url is not null)`.as('evidence_count')
    }),
    with: {
      profile: { columns: { positionTitle: true } },
      skps: {
        orderBy: activeSkpFirst(today),
        limit: 1,
        columns: { id: true },
        extras: s => ({ rhkCount: rhkCountOf(s) }),
        with: { periods: { orderBy: (p, { asc }) => [asc(p.sequence)] } }
      },
      transactions: paidCoverage(now)
    }
  })
  const skp = row?.skps[0] ?? null
  return {
    positionTitle: row?.profile?.positionTitle ?? null,
    hasSkp: !!skp,
    rhkCount: skp ? Number(skp.rhkCount) : 0,
    evidenceCount: skp ? Number(row!.evidenceCount) : 0,
    currentPeriod: skp ? currentPeriodOf(skp.periods, today) : null,
    activePackage: pickActivePackage(row?.transactions ?? [], now)
  }
}

/**
 * ONB-05: finish onboarding once profile essentials, an SKP and ≥1 RHK exist.
 * One read (profile + active SKP with RHK count), then the settings row and
 * the completion stamp.
 */
export async function completeOnboarding(userId: string, today: string) {
  const db = useDb()
  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true },
    with: {
      profile: { columns: { positionTitle: true, workUnit: true, agency: true } },
      skps: { orderBy: activeSkpFirst(today), limit: 1, columns: { id: true }, extras: s => ({ rhkCount: rhkCountOf(s) }) }
    }
  })
  const p = row?.profile
  if (!p?.positionTitle || !p.workUnit || !p.agency) {
    throw createError({ statusCode: 409, statusMessage: 'Lengkapi jabatan, unit kerja, dan instansi di langkah Isi profil' })
  }
  const skp = row?.skps[0]
  if (!skp) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi di langkah RHK' })
  }
  if (!Number(skp.rhkCount)) {
    throw createError({ statusCode: 409, statusMessage: 'Simpan minimal satu RHK' })
  }
  await db.transaction(async (tx) => {
    await tx.insert(schema.userSettings).values({ userId }).onConflictDoNothing()
    await tx.update(schema.users).set({ onboardingCompletedAt: new Date() }).where(eq(schema.users.id, userId))
  })
}

/** The user's settings row, created with defaults on first use (one statement). */
export async function ensureSettings(userId: string) {
  const s = schema.userSettings
  // The no-op update makes RETURNING yield the existing row on conflict.
  const [row] = await useDb().insert(s).values({ userId })
    .onConflictDoUpdate({ target: s.userId, set: { userId: sql`excluded.user_id` } })
    .returning()
  return row!
}

/** Create-or-update the settings row in one statement. */
export async function updateSettings(userId: string, input: SettingsInput) {
  const s = schema.userSettings
  if (!Object.keys(input).length) {
    await useDb().insert(s).values({ userId }).onConflictDoNothing()
    return
  }
  await useDb().insert(s).values({ userId, ...input }).onConflictDoUpdate({ target: s.userId, set: input })
}

/**
 * PRD privacy: everything the user stored, as JSON. One relational query
 * (soft-deleted rows included: it is their data), flattened per table.
 */
export async function exportAccount(userId: string) {
  const row = await useDb().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true },
    with: {
      profile: true,
      settings: true,
      skps: {
        with: {
          periods: true,
          rhks: { with: { indicators: true, actionPlans: true, realizations: true } }
        }
      },
      dailyProgress: { with: { results: true } }
    }
  })
  const skps = row?.skps ?? []
  const rhks = skps.flatMap(s => s.rhks)
  const progress = row?.dailyProgress ?? []
  return {
    profile: row?.profile ?? null,
    settings: row?.settings ?? null,
    skps: skps.map(({ periods: _p, rhks: _r, ...skp }) => skp),
    periods: skps.flatMap(s => s.periods),
    rhks: rhks.map(({ indicators: _i, actionPlans: _a, realizations: _z, ...rhk }) => rhk),
    indicators: rhks.flatMap(r => r.indicators),
    actionPlans: rhks.flatMap(r => r.actionPlans),
    dailyProgress: progress.map(({ results: _r, ...p }) => p),
    progressResults: progress.flatMap(p => p.results),
    realizations: rhks.flatMap(r => r.realizations)
  }
}
