import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return useDb().select({
    id: schema.document.id,
    name: schema.document.name,
    contentType: schema.document.contentType,
    size: schema.document.size,
    createdAt: schema.document.createdAt
  }).from(schema.document)
    .where(eq(schema.document.userId, user.id))
    .orderBy(desc(schema.document.createdAt))
})
