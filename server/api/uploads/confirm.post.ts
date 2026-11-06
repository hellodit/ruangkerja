import { and, eq, gt, isNull } from 'drizzle-orm'
import { confirmSchema } from '#shared/schemas/upload'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { uploadId } = await readValidatedBody(event, confirmSchema.parse)
  const db = useDb()

  // Atomically claim the pending upload: owner-only, unexpired, single use.
  const [pending] = await db.update(schema.pendingUploads)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(schema.pendingUploads.id, uploadId),
      eq(schema.pendingUploads.userId, user.id),
      isNull(schema.pendingUploads.consumedAt),
      gt(schema.pendingUploads.expiresAt, new Date())
    ))
    .returning()

  if (!pending) {
    throw createError({ statusCode: 404, statusMessage: 'Unggahan tidak ditemukan atau kedaluwarsa' })
  }

  try {
    const head = await headObject('public', pending.objectKey)
    if (!head) {
      throw createError({ statusCode: 422, statusMessage: 'File belum terunggah' })
    }
    if (head.size !== pending.size || head.contentType !== pending.contentType) {
      throw createError({ statusCode: 422, statusMessage: 'Ukuran atau jenis file tidak sesuai' })
    }
    if (!matchesMime(await readHead('public', pending.objectKey), pending.contentType)) {
      throw createError({ statusCode: 422, statusMessage: 'Isi file tidak sesuai dengan jenisnya' })
    }
  } catch (err) {
    // Nothing committed: leave no orphaned object behind.
    await deleteObject('public', pending.objectKey).catch(e =>
      console.error('[uploads] failed to delete rejected object', pending.objectKey, e))
    throw err
  }

  const [current] = await db.select({ image: schema.users.image }).from(schema.users).where(eq(schema.users.id, user.id))
  const image = publicUrl(pending.objectKey)
  await db.update(schema.users).set({ image }).where(eq(schema.users.id, user.id))
  if (current?.image !== image) {
    await deleteUserAvatar(user.id, current?.image ?? null)
  }
  return { image }
})
