import { and, eq, isNull, lt } from 'drizzle-orm'

/** Abuse limit for presigned uploads awaiting confirmation. */
export const MAX_ACTIVE_PENDING_UPLOADS = 10

/**
 * Remove a user's expired, never-confirmed uploads (and any object that was
 * PUT but never confirmed). Called opportunistically on presign.
 */
export async function purgeExpiredPendingUploads(userId: string) {
  const db = useDb()
  const expired = await db.select().from(schema.pendingUploads).where(and(
    eq(schema.pendingUploads.userId, userId),
    isNull(schema.pendingUploads.consumedAt),
    lt(schema.pendingUploads.expiresAt, new Date())
  ))
  for (const row of expired) {
    try {
      await deleteObject('public', row.objectKey)
      await db.delete(schema.pendingUploads).where(eq(schema.pendingUploads.id, row.id))
    } catch (err) {
      console.error('[uploads] failed to purge pending upload', row.id, err)
    }
  }
}

/** Delete the user's R2 avatar if `image` points at one. Never throws. */
export async function deleteUserAvatar(userId: string, image: string | null) {
  if (!image) {
    return
  }
  try {
    const key = keyFromPublicUrl(image)
    if (key && key.startsWith(`avatars/${userId}/`)) {
      await deleteObject('public', key)
    }
  } catch (err) {
    console.error('[uploads] failed to delete avatar', err)
  }
}
