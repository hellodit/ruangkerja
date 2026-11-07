import { relations } from 'drizzle-orm'
import { accounts } from './accounts'
import { actionPlans } from './action-plans'
import { aiSuggestions } from './ai-suggestions'
import { dailyProgress } from './daily-progress'
import { evaluationPeriods } from './evaluation-periods'
import { packages } from './packages'
import { pendingUploads } from './pending-uploads'
import { periodRealizations } from './period-realizations'
import { profiles } from './profiles'
import { progressResults } from './progress-results'
import { realizationSources } from './realization-sources'
import { rhkIndicators } from './rhk-indicators'
import { rhks } from './rhks'
import { sessions } from './sessions'
import { skps } from './skps'
import { transactions } from './transactions'
import { userSettings } from './user-settings'
import { users } from './users'

/**
 * Every relation of the relational query API (db.query.*), drizzle-orm 0.x
 * `relations()`. These are ORM metadata only: the foreign keys themselves are
 * declared on the columns in each table file. The `one()` side that holds the
 * foreign key names fields/references; its `many()`/`one()` counterpart is
 * inferred from it. Tables with two foreign keys to the same table pair them
 * with relationName.
 */

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  settings: one(userSettings),
  sessions: many(sessions),
  accounts: many(accounts),
  skps: many(skps),
  dailyProgress: many(dailyProgress),
  pendingUploads: many(pendingUploads),
  aiSuggestions: many(aiSuggestions),
  /** Packages the user bought (or was given). */
  transactions: many(transactions, { relationName: 'transactionUser' }),
  /** Manual transactions this admin recorded. */
  recordedTransactions: many(transactions, { relationName: 'transactionCreatedBy' })
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] })
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] })
}))

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] })
}))

// ---------------------------------------------------------------------------
// SKP, periods, RHK, indicators
// ---------------------------------------------------------------------------

export const skpsRelations = relations(skps, ({ one, many }) => ({
  user: one(users, { fields: [skps.userId], references: [users.id] }),
  periods: many(evaluationPeriods),
  rhks: many(rhks)
}))

export const evaluationPeriodsRelations = relations(evaluationPeriods, ({ one, many }) => ({
  skp: one(skps, { fields: [evaluationPeriods.skpId], references: [skps.id] }),
  actionPlans: many(actionPlans),
  realizations: many(periodRealizations)
}))

export const rhksRelations = relations(rhks, ({ one, many }) => ({
  skp: one(skps, { fields: [rhks.skpId], references: [skps.id] }),
  indicators: many(rhkIndicators),
  actionPlans: many(actionPlans),
  realizations: many(periodRealizations)
}))

export const rhkIndicatorsRelations = relations(rhkIndicators, ({ one }) => ({
  rhk: one(rhks, { fields: [rhkIndicators.rhkId], references: [rhks.id] })
}))

// ---------------------------------------------------------------------------
// Action plans, daily progress, results
// ---------------------------------------------------------------------------

export const actionPlansRelations = relations(actionPlans, ({ one, many }) => ({
  rhk: one(rhks, { fields: [actionPlans.rhkId], references: [rhks.id] }),
  period: one(evaluationPeriods, { fields: [actionPlans.periodId], references: [evaluationPeriods.id] }),
  /** The plan this one was copied from ("Salin dari periode sebelumnya"). */
  copiedFrom: one(actionPlans, { fields: [actionPlans.copiedFromId], references: [actionPlans.id], relationName: 'actionPlanCopy' }),
  copies: many(actionPlans, { relationName: 'actionPlanCopy' }),
  progress: many(dailyProgress)
}))

export const dailyProgressRelations = relations(dailyProgress, ({ one, many }) => ({
  user: one(users, { fields: [dailyProgress.userId], references: [users.id] }),
  actionPlan: one(actionPlans, { fields: [dailyProgress.actionPlanId], references: [actionPlans.id] }),
  results: many(progressResults),
  realizationSources: many(realizationSources)
}))

export const progressResultsRelations = relations(progressResults, ({ one }) => ({
  progress: one(dailyProgress, { fields: [progressResults.progressId], references: [dailyProgress.id] })
}))

export const aiSuggestionsRelations = relations(aiSuggestions, ({ one }) => ({
  user: one(users, { fields: [aiSuggestions.userId], references: [users.id] })
}))

// ---------------------------------------------------------------------------
// Period realization
// ---------------------------------------------------------------------------

export const periodRealizationsRelations = relations(periodRealizations, ({ one, many }) => ({
  rhk: one(rhks, { fields: [periodRealizations.rhkId], references: [rhks.id] }),
  period: one(evaluationPeriods, { fields: [periodRealizations.periodId], references: [evaluationPeriods.id] }),
  sources: many(realizationSources)
}))

export const realizationSourcesRelations = relations(realizationSources, ({ one }) => ({
  realization: one(periodRealizations, { fields: [realizationSources.realizationId], references: [periodRealizations.id] }),
  progress: one(dailyProgress, { fields: [realizationSources.progressId], references: [dailyProgress.id] })
}))

// ---------------------------------------------------------------------------
// Uploads, packages and transactions
// ---------------------------------------------------------------------------

export const pendingUploadsRelations = relations(pendingUploads, ({ one }) => ({
  user: one(users, { fields: [pendingUploads.userId], references: [users.id] })
}))

export const packagesRelations = relations(packages, ({ many }) => ({
  transactions: many(transactions)
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  /** Null once the user deleted their account (the row keeps a copy of name/email). */
  user: one(users, { fields: [transactions.userId], references: [users.id], relationName: 'transactionUser' }),
  /** Null when the package row is gone; packageName/durationDays are the copy. */
  package: one(packages, { fields: [transactions.packageId], references: [packages.id] }),
  /** Admin who recorded a manual transaction. */
  createdByUser: one(users, { fields: [transactions.createdBy], references: [users.id], relationName: 'transactionCreatedBy' })
}))
