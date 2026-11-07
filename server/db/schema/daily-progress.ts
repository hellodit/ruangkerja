import { sql } from 'drizzle-orm'
import { boolean, check, date, index, pgEnum, pgTable, text, time, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps, softDelete, num } from './columns'
import { users } from './users'
import { actionPlans } from './action-plans'

export const inputMethodEnum = pgEnum('input_method', ['typed', 'voice'])
export const progressCategoryEnum = pgEnum('progress_category', ['biasa', 'perlu_diskusi'])

export const dailyProgress = pgTable('daily_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionPlanId: uuid('action_plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
  workDate: date('work_date', { mode: 'string' }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  description: text('description').notNull(),
  descriptionRaw: text('description_raw'),
  inputMethod: inputMethodEnum('input_method').notNull().default('typed'),
  realization: num('realization').notNull().default(0),
  category: progressCategoryEnum('category').notNull().default('biasa'),
  marksPlanComplete: boolean('marks_plan_complete').notNull().default(false),
  copiedAt: timestamp('copied_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete
}, t => [
  index('daily_progress_user_date_idx').on(t.userId, t.workDate),
  index('daily_progress_plan_idx').on(t.actionPlanId),
  check('daily_progress_time_ck', sql`${t.endTime} > ${t.startTime}`)
])
