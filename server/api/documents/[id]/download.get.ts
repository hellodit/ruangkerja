const DOWNLOAD_TTL_SECONDS = 300

export default defineEventHandler(async (event) => {
  const doc = await requireOwnedDocument(event)
  const url = await presignGet({
    bucket: 'private',
    key: doc.objectKey,
    fileName: doc.name,
    expiresIn: DOWNLOAD_TTL_SECONDS
  })
  return { url, expiresIn: DOWNLOAD_TTL_SECONDS }
})
