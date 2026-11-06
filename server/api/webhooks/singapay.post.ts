import { and, eq, isNull, lt } from 'drizzle-orm'

const MAX_BODY_BYTES = 1024 * 1024
/** An unprocessed claim older than this is assumed crashed and may be reclaimed. */
const STALE_CLAIM_MS = 5 * 60 * 1000

export default defineEventHandler(async (event) => {
  const declaredLength = Number(getHeader(event, 'content-length') ?? '0')
  if (declaredLength > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large' })
  }
  const rawBody = (await readRawBody(event, 'utf8')) ?? ''
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large' })
  }

  const result = verifySingapaySignature({
    rawBody,
    headers: {
      'x-signature': getHeader(event, 'x-signature'),
      'x-timestamp': getHeader(event, 'x-timestamp'),
      'authorization': getHeader(event, 'authorization')
    },
    path: event.path,
    secrets: useRuntimeConfig().singapay.webhookSecret.split(',')
  })

  if (!result.ok) {
    console.warn('[singapay] webhook rejected', { reason: result.reason, path: event.path })
    if (result.reason === 'invalid_body') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
    }
    if (result.reason === 'not_configured') {
      throw createError({ statusCode: 503, statusMessage: 'Webhook not configured' })
    }
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  const payload: unknown = JSON.parse(rawBody)
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const type = detectEventType(payload)
  // Retries deliver identical bytes, so the body hash is a stable idempotency key.
  const eventId = sha256Hex(rawBody)
  const claimId = await claim(eventId, type, payload as Record<string, unknown>)
  if (!claimId) {
    return { received: true, duplicate: true }
  }

  const db = useDb()
  try {
    await handleSingapayEvent(type, payload as Record<string, unknown>)
  } catch (err) {
    // Release the claim so SingaPay's retry can reprocess (at-least-once).
    await db.delete(schema.singapayWebhookEvent).where(eq(schema.singapayWebhookEvent.id, claimId))
    console.error('[singapay] handler failed', { eventId, type, err })
    throw createError({ statusCode: 500, statusMessage: 'Processing failed' })
  }

  await db.update(schema.singapayWebhookEvent)
    .set({ processedAt: new Date() })
    .where(eq(schema.singapayWebhookEvent.id, claimId))

  return { received: true }
})

/**
 * Claim a delivery by inserting its ledger row; the unique event_id decides
 * which concurrent copy wins. Returns the row id, or null for a duplicate.
 */
async function claim(eventId: string, eventType: string | null, payload: Record<string, unknown>, retrying = false): Promise<string | null> {
  const db = useDb()
  const [row] = await db.insert(schema.singapayWebhookEvent)
    .values({ eventId, eventType, payload })
    .onConflictDoNothing({ target: schema.singapayWebhookEvent.eventId })
    .returning({ id: schema.singapayWebhookEvent.id })
  if (row) {
    return row.id
  }
  if (retrying) {
    return null
  }
  // Reclaim a stale claim left behind by a crashed worker (once).
  const removed = await db.delete(schema.singapayWebhookEvent).where(and(
    eq(schema.singapayWebhookEvent.eventId, eventId),
    isNull(schema.singapayWebhookEvent.processedAt),
    lt(schema.singapayWebhookEvent.createdAt, new Date(Date.now() - STALE_CLAIM_MS))
  )).returning({ id: schema.singapayWebhookEvent.id })
  return removed.length > 0 ? claim(eventId, eventType, payload, true) : null
}
