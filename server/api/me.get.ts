import { and, count, eq, isNotNull, isNull } from 'drizzle-orm'

/** Shell data: who is signed in, onboarding state, sidebar counters. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const db = useDb()
  const [profile] = await db.select({ positionTitle: schema.profiles.positionTitle }).from(schema.profiles).where(eq(schema.profiles.userId, user.id))
  const ws = await getWorkspace(user.id, today)
  const now = new Date()
  const pkg = (await activePackages([user.id], now)).get(user.id)

  let rhkCount = 0
  let evidenceCount = 0
  if (ws) {
    const [r] = await db.select({ n: count() }).from(schema.rhks).where(and(eq(schema.rhks.skpId, ws.skp.id), isNull(schema.rhks.deletedAt)))
    rhkCount = r?.n ?? 0
    const [e] = await db.select({ n: count() }).from(schema.progressResults)
      .innerJoin(schema.dailyProgress, eq(schema.dailyProgress.id, schema.progressResults.progressId))
      .where(and(eq(schema.dailyProgress.userId, user.id), isNull(schema.dailyProgress.deletedAt), isNotNull(schema.progressResults.evidenceUrl)))
    evidenceCount = e?.n ?? 0
  }

  return {
    user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null, timezone: user.timezone },
    positionTitle: profile?.positionTitle ?? null,
    today,
    onboardingCompleted: !!user.onboardingCompletedAt,
    isAdmin: (user as { role?: string }).role === 'admin',
    // Active package (ends = paid coverage incl. queued renewals). Null: show /subscription.
    subscription: pkg ? { name: pkg.name, endsAt: pkg.paidUntil.toISOString(), daysLeft: daysLeft(pkg.paidUntil, now) } : null,
    hasSkp: !!ws,
    rhkCount,
    evidenceCount,
    currentPeriod: ws?.current ? { id: ws.current.id, label: ws.current.label, startDate: ws.current.startDate, endDate: ws.current.endDate, submissionDeadline: ws.current.submissionDeadline } : null
  }
})
