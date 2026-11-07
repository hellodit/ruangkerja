import { date, index, pgTable, smallint, text, unique, uuid } from 'drizzle-orm/pg-core'
import { skps } from './skps'

export const evaluationPeriods = pgTable('evaluation_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  skpId: uuid('skp_id').notNull().references(() => skps.id, { onDelete: 'cascade' }),
  sequence: smallint('sequence').notNull(),
  label: text('label').notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  submissionDeadline: date('submission_deadline', { mode: 'string' }).notNull()
}, t => [
  unique('evaluation_periods_skp_seq_uq').on(t.skpId, t.sequence),
  index('evaluation_periods_skp_start_idx').on(t.skpId, t.startDate)
])
