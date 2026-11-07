import { z } from 'zod'

const bodySchema = z.object({
  rhkId: z.uuid(),
  fromPeriodId: z.uuid(),
  toPeriodId: z.uuid()
})

/** RHK-03 "Salin dari periode sebelumnya" (see copyActionPlans). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, bodySchema.parse)
  return { created: await copyActionPlans(user.id, input) }
})
