import { eq } from 'drizzle-orm'
import { actionPlanUpdateSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const { plan } = await requireOwnedActionPlan(user.id, id)
  const input = await readValidatedBody(event, actionPlanUpdateSchema.parse)
  const completedAt = input.status === undefined
    ? undefined
    : input.status === 'selesai' ? (plan.completedAt ?? new Date()) : null
  const [row] = await useDb().update(schema.actionPlans)
    .set({ ...input, ...(completedAt !== undefined ? { completedAt } : {}) })
    .where(eq(schema.actionPlans.id, id)).returning()
  return row
})
