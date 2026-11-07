import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { eq } from 'drizzle-orm'

/** RLS-03: real .docx (opens cleanly in Word and WPS) with the independence statement. */
export default defineEventHandler(async (event) => {
  const { user, today, timezone } = await requireWorkspaceUser(event)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, getQuery(event).periodId)
  const { rhks } = await buildRealizations(user.id, ws, period, today, timezone)
  const [profile] = await useDb().select().from(schema.profiles).where(eq(schema.profiles.userId, user.id))

  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })] })
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: `Draf Realisasi ${period.label}` })] }),
    new Paragraph({ children: [new TextRun({ text: `${formatDate(period.startDate)} – ${formatDate(period.endDate)} · Batas pengisian ${formatDateLong(period.submissionDeadline)}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: [user.name, profile?.positionTitle, profile?.workUnit, profile?.agency].filter(Boolean).join(' · '), size: 20 })] }),
    new Paragraph({ text: '' })
  ]

  for (const r of rhks) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `RHK ${r.rhk.number}. ${r.rhk.statement}` })] }))
    if (r.indicator) {
      children.push(new Paragraph({ children: [new TextRun({ text: `IKI: ${r.indicator.indicator} · Target tahunan ${formatNumber(r.indicator.target)} ${r.indicator.unit}`, italics: true, size: 20 })] }))
    }
    const narrative = realizationText(r)
    for (const para of (narrative || 'Belum ada progres harian pada periode ini.').split(/\n\n+/)) {
      children.push(new Paragraph({ children: [new TextRun({ text: para })], spacing: { after: 120 } }))
    }
    if (r.plans.length) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: ['Rencana aksi', 'Target', 'Realisasi', 'Bukti', 'Status'].map(h => cell(h, true)) }),
          ...r.plans.map(p => new TableRow({ children: [
            cell(p.name),
            cell(`${formatNumber(p.target)} ${p.unit}`),
            cell(formatNumber(p.realization)),
            cell(String(p.evidence)),
            cell(p.overdue ? 'Lewat tenggat' : planStatusLabel(p.status))
          ] }))
        ]
      }))
    }
    if (r.excluded.length) {
      children.push(new Paragraph({ children: [new TextRun({ text: `Belum punya progres harian, tidak dimasukkan: ${r.excluded.join('; ')}.`, italics: true, size: 18 })] }))
    }
    children.push(new Paragraph({ text: '' }))
  }

  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text: `Draf personal disusun dari progres harian yang dicatat pengguna. RuangKerja adalah aplikasi independen, bukan aplikasi resmi pemerintah, tidak terhubung ke e-Kinerja BKN, dan tidak menggantikan penilaian resmi. Kebijakan privasi: ${useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')}/privasi`, size: 16, italics: true })]
  }))

  const doc = new Document({
    creator: 'RuangKerja',
    title: `Draf Realisasi ${period.label}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }]
  })
  const buffer = await Packer.toBuffer(doc)
  const fileName = `Realisasi-${period.label.replace(/\s+/g, '-')}-${period.startDate.slice(0, 4)}.docx`
  setResponseHeaders(event, {
    'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'content-disposition': `attachment; filename="${fileName}"`,
    'cache-control': 'no-store'
  })
  return buffer
})
