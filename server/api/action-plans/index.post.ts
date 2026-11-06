import { and, eq, sql } from 'drizzle-orm'
import { actionPlanSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, actionPlanSchema.parse)
  const { skp } = await requireOwnedRhk(user.id, input.rhkId)
  const period = await requireOwnedPeriod(user.id, input.periodId)
  if (period.skpId !== skp.id) {
    throw createError({ statusCode: 422, statusMessage: 'Periode tidak sesuai dengan SKP RHK ini' })
  }
  const db = useDb()
  const [max] = await db.select({ n: sql<number>`coalesce(max(${schema.actionPlans.position}), -1)::int` }).from(schema.actionPlans)
    .where(and(eq(schema.actionPlans.rhkId, input.rhkId), eq(schema.actionPlans.periodId, input.periodId)))
  const [plan] = await db.insert(schema.actionPlans).values({ ...input, position: (max?.n ?? -1) + 1 }).returning()
  setResponseStatus(event, 201)
  return plan
})
