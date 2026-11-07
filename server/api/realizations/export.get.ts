import { eq } from 'drizzle-orm'

/** RLS-03: download the period realization as an A4 .docx (Word, WPS, LibreOffice). */
export default defineEventHandler(async (event) => {
  const { user, today, timezone } = await requireWorkspaceUser(event)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, getQuery(event).periodId)
  const { rhks } = await buildRealizations(user.id, ws, period, today, timezone)
  const [profile] = await useDb().select().from(schema.profiles).where(eq(schema.profiles.userId, user.id))

  const report: RealizationReport = {
    period,
    skpYear: ws.skp.year,
    generatedOn: today,
    privacyUrl: `${useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')}/privasi`,
    person: {
      name: user.name,
      nip: decryptField(profile?.nip),
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

  const buffer = await buildRealizationDocx(report)
  const fileName = reportFileName(report)
  setResponseHeaders(event, {
    'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'content-disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'cache-control': 'no-store'
  })
  return buffer
})
