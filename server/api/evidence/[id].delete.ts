import { and, eq } from 'drizzle-orm'

/** Remove only the link; the result (what was produced) stays on the progress. */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const r = schema.progressResults
  const [row] = await useDb().update(r).set({ evidenceUrl: null })
    .where(and(eq(r.id, id), ownsProgress(user.id, r.progressId)))
    .returning({ id: r.id })
  if (!row) notFound('Bukti')
  return { ok: true }
})
