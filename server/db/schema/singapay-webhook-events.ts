import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** Idempotency ledger for SingaPay webhook deliveries. */
export const singapayWebhookEvents = pgTable('singapay_webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type'),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})
