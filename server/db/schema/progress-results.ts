import { index, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { dailyProgress } from './daily-progress'

export const progressResults = pgTable('progress_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  progressId: uuid('progress_id').notNull().references(() => dailyProgress.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  evidenceUrl: text('evidence_url'),
  position: smallint('position').notNull().default(0),
  ...timestamps
}, t => [index('progress_results_progress_idx').on(t.progressId)])
