import { boolean, pgEnum, pgTable, smallint, time, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { users } from './users'

export const progressViewEnum = pgEnum('progress_view', ['list', 'calendar'])

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  remindBeforeDeadline: boolean('remind_before_deadline').notNull().default(true),
  remindDaysBefore: smallint('remind_days_before').notNull().default(3),
  remindDaily: boolean('remind_daily').notNull().default(true),
  remindDailyTime: time('remind_daily_time').notNull().default('16:00'),
  progressView: progressViewEnum('progress_view').notNull().default('list'),
  ...timestamps
})
