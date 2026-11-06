import { and, eq, isNull, lt } from 'drizzle-orm'

/** Abuse limits for uploads. */
export const MAX_ACTIVE_PENDING_UPLOADS = 10
export const MAX_DOCUMENTS_PER_USER = 50

/**
 * Remove a user's expired, never-confirmed uploads (and any object that was
 * PUT but never confirmed). Called opportunistically on presign.
 */
export async function purgeExpiredPendingUploads(userId: string) {
  const db = useDb()
  const expired = await db.select().from(schema.pendingUpload).where(and(
    eq(schema.pendingUpload.userId, userId),
    isNull(schema.pendingUpload.consumedAt),
    lt(schema.pendingUpload.expiresAt, new Date())
  ))
  for (const row of expired) {
    try {
      await deleteObject(row.bucket, row.objectKey)
      await db.delete(schema.pendingUpload).where(eq(schema.pendingUpload.id, row.id))
    } catch (err) {
      console.error('[uploads] failed to purge pending upload', row.id, err)
    }
  }
}
