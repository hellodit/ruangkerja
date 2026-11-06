import { and, count, eq, gt, isNull } from 'drizzle-orm'
import { extensionFor, presignSchema, sanitizeFileName, UPLOAD_RULES, UPLOAD_TTL_SECONDS } from '#shared/schemas/upload'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readValidatedBody(event, presignSchema.parse)
  const rule = UPLOAD_RULES[input.kind]
  const db = useDb()

  await purgeExpiredPendingUploads(user.id)

  const [active] = await db.select({ n: count() }).from(schema.pendingUpload).where(and(
    eq(schema.pendingUpload.userId, user.id),
    isNull(schema.pendingUpload.consumedAt),
    gt(schema.pendingUpload.expiresAt, new Date())
  ))
  if ((active?.n ?? 0) >= MAX_ACTIVE_PENDING_UPLOADS) {
    throw createError({ statusCode: 429, statusMessage: 'Too many pending uploads' })
  }

  if (input.kind === 'document') {
    const [docs] = await db.select({ n: count() }).from(schema.document).where(eq(schema.document.userId, user.id))
    if ((docs?.n ?? 0) >= MAX_DOCUMENTS_PER_USER) {
      throw createError({ statusCode: 409, statusMessage: 'Document limit reached' })
    }
  }

  const prefix = input.kind === 'avatar' ? 'avatars' : 'documents'
  const objectKey = `${prefix}/${user.id}/${crypto.randomUUID()}.${extensionFor(input.contentType)}`

  const [pending] = await db.insert(schema.pendingUpload).values({
    userId: user.id,
    kind: input.kind,
    bucket: rule.bucket,
    objectKey,
    contentType: input.contentType,
    size: input.size,
    fileName: sanitizeFileName(input.fileName),
    expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000)
  }).returning({ id: schema.pendingUpload.id })

  const signed = await presignPut({
    bucket: rule.bucket,
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
