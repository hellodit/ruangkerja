export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const [entry] = await loadProgress(user.id, { ids: [id] })
  if (!entry) {
    notFound('Progres harian')
  }
  return { ...entry, ekinerjaText: formatEkinerjaCopy([toEkinerjaEntry(entry)]) }
})
