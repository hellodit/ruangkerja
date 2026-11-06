/** RHK-01: RHK cards with indicators and a summary of the current period. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const ws = await getWorkspace(user.id, today)
  if (!ws) {
    return { skp: null, current: null, rhks: [] }
  }
  const rhks = await listRhks(ws.skp.id)
  const plans = ws.current ? await listPlans(rhks.map(r => r.id), ws.current.id, today) : []
  return {
    skp: ws.skp,
    current: ws.current,
    rhks: rhks.map((r) => {
      const mine = plans.filter(p => p.rhkId === r.id)
      return {
        ...r,
        summary: {
          plans: mine.length,
          done: mine.filter(p => p.status === 'selesai').length,
          overdue: mine.filter(p => p.overdue).length,
          notStarted: mine.filter(p => p.status === 'belum_dimulai').length,
          progress: mine.reduce((n, p) => n + p.progressCount, 0)
        }
      }
    })
  }
})
