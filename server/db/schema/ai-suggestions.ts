import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const aiTargetTypeEnum = pgEnum('ai_target_type', ['progress_description', 'realization'])

/** Audit trail for AI suggestions (Rilis 1.1). Schema only in Rilis 1.0. */
export const aiSuggestions = pgTable('ai_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: aiTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  originalText: text('original_text').notNull(),
  suggestedText: text('suggested_text').notNull(),
  model: text('model').notNull(),
  accepted: boolean('accepted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, t => [index('ai_suggestions_user_idx').on(t.userId)])
