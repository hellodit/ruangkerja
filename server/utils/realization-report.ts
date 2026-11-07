import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { RealizationReport } from './realization-docx'

/** Collect everything the Word and PDF exports print for one period (RLS-03). */
export async function loadRealizationReport(event: H3Event): Promise<RealizationReport> {
  const { user, today, timezone } = await requireWorkspaceUser(event)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, getQuery(event).periodId)
  const { rhks } = await buildRealizations(user.id, ws, period, today, timezone)
  const [profile] = await useDb().select().from(schema.profiles).where(eq(schema.profiles.userId, user.id))

  return {
    period,
    skpYear: ws.skp.year,
    generatedOn: today,
    privacyUrl: `${useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')}/privasi`,
    person: {
      name: user.name,
      nip: profile?.nip,
      rankGrade: profile?.rankGrade,
      positionTitle: profile?.positionTitle,
      workUnit: profile?.workUnit,
      agency: profile?.agency,
      supervisorName: profile?.supervisorName,
      supervisorTitle: profile?.supervisorTitle
    },
    rhks: rhks.map(r => ({
      number: r.rhk.number,
      type: r.rhk.type,
      statement: r.rhk.statement,
      indicators: r.indicators,
      text: realizationText(r),
      plans: r.plans,
      sources: r.sources,
      excluded: r.excluded
    }))
  }
}
