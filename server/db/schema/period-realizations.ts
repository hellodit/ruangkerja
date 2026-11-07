import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { evaluationPeriods } from './evaluation-periods'
import { rhks } from './rhks'

export const realizationStatusEnum = pgEnum('realization_status', ['draf', 'disalin'])

export const periodRealizations = pgTable('period_realizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  rhkId: uuid('rhk_id').notNull().references(() => rhks.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id').notNull().references(() => evaluationPeriods.id, { onDelete: 'cascade' }),
  draftText: text('draft_text').notNull(),
  finalText: text('final_text'),
  status: realizationStatusEnum('status').notNull().default('draf'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  copiedAt: timestamp('copied_at', { withTimezone: true })
}, t => [
  unique('period_realizations_rhk_period_uq').on(t.rhkId, t.periodId),
  // The unique index leads with rhk_id; period_id needs its own for the period FK cascade.
  index('period_realizations_period_idx').on(t.periodId)
])
