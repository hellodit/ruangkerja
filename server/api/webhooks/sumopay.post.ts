import { and, eq, isNull, lt } from 'drizzle-orm'

const MAX_BODY_BYTES = 1024 * 1024
/** An unprocessed claim older than this is assumed crashed and may be reclaimed. */
const STALE_CLAIM_MS = 5 * 60 * 1000

/** SumoPay Managed Payment webhook: payment.completed / payment.failed / payment.expired. */
export default defineEventHandler(async (event) => {
  const declaredLength = Number(getHeader(event, 'content-length') ?? '0')
  if (declaredLength > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large' })
  }
  const rawBody = (await readRawBody(event, 'utf8')) ?? ''
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large' })
  }

  const result = verifySumopayWebhook({
    rawBody,
    headers: {
      'svix-id': getHeader(event, 'svix-id'),
      'svix-timestamp': getHeader(event, 'svix-timestamp'),
      'svix-signature': getHeader(event, 'svix-signature')
    },
    secrets: useRuntimeConfig().sumopay.webhookSecret.split(',')
  })

  if (!result.ok) {
    console.warn('[sumopay] webhook rejected', { reason: result.reason })
    if (result.reason === 'not_configured') {
      throw createError({ statusCode: 503, statusMessage: 'Webhook not configured' })
    }
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const parsed = parseSumopayEvent(payload)
  // svix-id stays the same across retries of one message: the idempotency key.
  const claimId = await claim(result.id, parsed.type, payload as Record<string, unknown>)
  if (!claimId) {
    return { received: true, duplicate: true }
  }

  const db = useDb()
  try {
    await handleSumopayEvent(parsed)
  } catch (err) {
    // Release the claim so SumoPay's retry can reprocess (at-least-once).
    await db.delete(schema.sumopayWebhookEvents).where(eq(schema.sumopayWebhookEvents.id, claimId))
    console.error('[sumopay] handler failed', { eventId: result.id, type: parsed.type, err })
    throw createError({ statusCode: 500, statusMessage: 'Processing failed' })
  }

  await db.update(schema.sumopayWebhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(schema.sumopayWebhookEvents.id, claimId))

  return { received: true }
})

/**
 * Claim a delivery by inserting its ledger row; the unique event_id decides
 * which concurrent copy wins. Returns the row id, or null for a duplicate.
 */
async function claim(eventId: string, eventType: string | null, payload: Record<string, unknown>, retrying = false): Promise<string | null> {
  const db = useDb()
  const w = schema.sumopayWebhookEvents
  const [row] = await db.insert(w)
    .values({ eventId, eventType, payload })
    .onConflictDoNothing({ target: w.eventId })
    .returning({ id: w.id })
  if (row) {
    return row.id
  }
  if (retrying) {
    return null
  }
  // Reclaim a stale claim left behind by a crashed worker (once).
  const removed = await db.delete(w).where(and(
    eq(w.eventId, eventId),
    isNull(w.processedAt),
    lt(w.createdAt, new Date(Date.now() - STALE_CLAIM_MS))
  )).returning({ id: w.id })
  return removed.length > 0 ? claim(eventId, eventType, payload, true) : null
}
