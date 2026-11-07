import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core'
import { dailyProgress } from './daily-progress'
import { periodRealizations } from './period-realizations'

export const realizationSources = pgTable('realization_sources', {
  realizationId: uuid('realization_id').notNull().references(() => periodRealizations.id, { onDelete: 'cascade' }),
  progressId: uuid('progress_id').notNull().references(() => dailyProgress.id, { onDelete: 'cascade' })
}, t => [
  primaryKey({ columns: [t.realizationId, t.progressId] }),
  // The primary key leads with realization_id; progress_id needs its own for the progress FK cascade.
  index('realization_sources_progress_idx').on(t.progressId)
])
