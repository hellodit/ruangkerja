import { and, count, eq, gt, isNull } from 'drizzle-orm'
import { extensionFor, presignSchema, UPLOAD_TTL_SECONDS } from '#shared/schemas/upload'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readValidatedBody(event, presignSchema.parse)
  const db = useDb()

  await purgeExpiredPendingUploads(user.id)

  const [active] = await db.select({ n: count() }).from(schema.pendingUploads).where(and(
    eq(schema.pendingUploads.userId, user.id),
    isNull(schema.pendingUploads.consumedAt),
    gt(schema.pendingUploads.expiresAt, new Date())
  ))
  if ((active?.n ?? 0) >= MAX_ACTIVE_PENDING_UPLOADS) {
    throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak unggahan yang belum selesai' })
  }

  const objectKey = `avatars/${user.id}/${crypto.randomUUID()}.${extensionFor(input.contentType)}`

  const [pending] = await db.insert(schema.pendingUploads).values({
    userId: user.id,
    kind: input.kind,
    objectKey,
    contentType: input.contentType,
    size: input.size,
    expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000)
  }).returning({ id: schema.pendingUploads.id })

  const signed = await presignPut({
    bucket: 'public',
    key: objectKey,
    contentType: input.contentType,
    size: input.size,
    expiresIn: UPLOAD_TTL_SECONDS
  })

  return {
    uploadId: pending!.id,
    url: signed.url,
    headers: signed.headers,
    expiresIn: UPLOAD_TTL_SECONDS
  }
})
