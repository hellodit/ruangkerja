import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const doc = await requireOwnedDocument(event)
  await deleteObject('private', doc.objectKey)
  await useDb().delete(schema.document).where(eq(schema.document.id, doc.id))
  return { ok: true }
})
