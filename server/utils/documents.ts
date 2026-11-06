import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const idParam = z.object({ id: z.uuid() })

/** Load a document owned by the current user, or throw 404. */
export async function requireOwnedDocument(event: H3Event) {
  const user = await requireUser(event)
  const { id } = await getValidatedRouterParams(event, idParam.parse)
  const [doc] = await useDb().select().from(schema.document)
    .where(and(eq(schema.document.id, id), eq(schema.document.userId, user.id)))
  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }
  return doc
}
