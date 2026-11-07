import { packageSchema } from '#shared/schemas/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = await readValidatedBody(event, packageSchema.parse)
  const [row] = await useDb().insert(schema.packages).values(input).returning({ id: schema.packages.id })
  setResponseStatus(event, 201)
  return { id: row!.id }
})
