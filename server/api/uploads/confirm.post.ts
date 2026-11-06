import { and, eq, gt, isNull } from 'drizzle-orm'
import { confirmSchema } from '#shared/schemas/upload'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { uploadId } = await readValidatedBody(event, confirmSchema.parse)
  const db = useDb()

  // Atomically claim the pending upload: owner-only, unexpired, single use.
  const [pending] = await db.update(schema.pendingUpload)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(schema.pendingUpload.id, uploadId),
      eq(schema.pendingUpload.userId, user.id),
      isNull(schema.pendingUpload.consumedAt),
      gt(schema.pendingUpload.expiresAt, new Date())
    ))
    .returning()

  if (!pending) {
    throw createError({ statusCode: 404, statusMessage: 'Upload not found or expired' })
  }

  try {
    return await finalize(user.id, pending)
  } catch (err) {
    // Anything that did not commit leaves no orphaned object behind.
    await deleteObject(pending.bucket, pending.objectKey).catch(e =>
      console.error('[uploads] failed to delete rejected object', pending.objectKey, e))
    throw err
  }
})

type PendingUpload = typeof schema.pendingUpload.$inferSelect

async function finalize(userId: string, pending: PendingUpload) {
  const db = useDb()

  const head = await headObject(pending.bucket, pending.objectKey)
  if (!head) {
    throw createError({ statusCode: 422, statusMessage: 'File was not uploaded' })
  }
  if (head.size !== pending.size || head.contentType !== pending.contentType) {
    throw createError({ statusCode: 422, statusMessage: 'Uploaded file does not match the requested size or type' })
  }

  const firstBytes = await readHead(pending.bucket, pending.objectKey)
  if (!matchesMime(firstBytes, pending.contentType)) {
    throw createError({ statusCode: 422, statusMessage: 'File content does not match its type' })
  }

  if (pending.kind === 'avatar') {
    const [current] = await db.select({ image: schema.user.image }).from(schema.user).where(eq(schema.user.id, userId))
    const image = publicUrl(pending.objectKey)
    await db.update(schema.user).set({ image }).where(eq(schema.user.id, userId))

    // Committed. Remove the previous avatar only if it is one of this user's
    // R2 objects (a Google profile photo URL is left alone). Never throws.
    const oldKey = current?.image ? keyFromPublicUrl(current.image) : null
    if (oldKey && oldKey !== pending.objectKey && oldKey.startsWith(`avatars/${userId}/`)) {
      await deleteObject('public', oldKey).catch(err =>
        console.error('[uploads] failed to delete old avatar', oldKey, err))
    }
    return { kind: 'avatar' as const, image }
  }

  const [doc] = await db.insert(schema.document).values({
    userId,
    name: pending.fileName,
    objectKey: pending.objectKey,
    contentType: pending.contentType,
    size: pending.size
  }).returning({
    id: schema.document.id,
    name: schema.document.name,
    contentType: schema.document.contentType,
    size: schema.document.size,
    createdAt: schema.document.createdAt
  })

  return { kind: 'document' as const, document: doc! }
}
