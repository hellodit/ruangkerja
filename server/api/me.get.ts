/** Shell data: who is signed in, onboarding state, sidebar counters (one query, see getShellData). */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const now = new Date()
  const shell = await getShellData(user.id, today, now)
  const pkg = shell.activePackage
  const period = shell.currentPeriod

  return {
    user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null, timezone: user.timezone },
    positionTitle: shell.positionTitle,
    today,
    onboardingCompleted: !!user.onboardingCompletedAt,
    isAdmin: (user as { role?: string }).role === 'admin',
    // Active package (ends = paid coverage incl. queued renewals). Null: show /subscription.
    subscription: pkg ? { name: pkg.name, endsAt: pkg.paidUntil.toISOString(), daysLeft: daysLeft(pkg.paidUntil, now) } : null,
    hasSkp: shell.hasSkp,
    rhkCount: shell.rhkCount,
    evidenceCount: shell.evidenceCount,
    currentPeriod: period ? { id: period.id, label: period.label, startDate: period.startDate, endDate: period.endDate, submissionDeadline: period.submissionDeadline } : null
  }
})
