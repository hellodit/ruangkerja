/**
 * RLS-03: download the period realization.
 * ?format=docx (default, Word/WPS/LibreOffice) or ?format=pdf.
 */
export default defineEventHandler(async (event) => {
  const format = getQuery(event).format === 'pdf' ? 'pdf' : 'docx'
  const report = await loadRealizationReport(event)

  const buffer = format === 'pdf' ? await buildRealizationPdf(report) : await buildRealizationDocx(report)
  const fileName = reportFileName(report, format)
  setResponseHeaders(event, {
    'content-type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'content-disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'cache-control': 'no-store'
  })
  return buffer
})
