import { sql } from 'drizzle-orm'
import { check, pgEnum, pgTable, smallint, unique, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { users } from './users'

export const evaluationFrequencyEnum = pgEnum('evaluation_frequency', ['monthly', 'quarterly'])

export const skps = pgTable('skps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  year: smallint('year').notNull(),
  evaluationFrequency: evaluationFrequencyEnum('evaluation_frequency').notNull().default('monthly'),
  submissionDeadlineDay: smallint('submission_deadline_day').notNull().default(5),
  ...timestamps
}, t => [
  unique('skps_user_year_uq').on(t.userId, t.year),
  check('skps_deadline_day_ck', sql`${t.submissionDeadlineDay} between 1 and 28`)
])
