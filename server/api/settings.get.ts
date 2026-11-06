export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const s = await ensureSettings(user.id)
  return {
    remindBeforeDeadline: s.remindBeforeDeadline,
    remindDaysBefore: s.remindDaysBefore,
    remindDaily: s.remindDaily,
    remindDailyTime: s.remindDailyTime.slice(0, 5),
    progressView: s.progressView
  }
})
