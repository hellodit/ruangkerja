/** RHK-01: RHK cards with indicators and a summary of the current period. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const ws = await getWorkspace(user.id, today)
  if (!ws) {
    return { skp: null, current: null, rhks: [] }
  }
  const { rhks } = await listRhksWithPlans(ws.skp.id, ws.current?.id ?? null, today)
  return {
    skp: ws.skp,
    current: ws.current,
    rhks: rhks.map(({ plans, ...r }) => ({
      ...r,
      summary: {
        plans: plans.length,
        done: plans.filter(p => p.status === 'selesai').length,
        overdue: plans.filter(p => p.overdue).length,
        notStarted: plans.filter(p => p.status === 'belum_dimulai').length,
        progress: plans.reduce((n, p) => n + p.progressCount, 0)
      }
    }))
  }
})
