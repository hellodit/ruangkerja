import { presignSchema, type UploadKind } from '#shared/schemas/upload'

interface PresignResponse {
  uploadId: string
  url: string
  headers: Record<string, string>
  expiresIn: number
}

export interface UploadedDocument {
  id: string
  name: string
  contentType: string
  size: number
  createdAt: string
}

type ConfirmResponse
  = | { kind: 'avatar', image: string }
    | { kind: 'document', document: UploadedDocument }

/** Error whose message is an i18n key. */
export class UploadError extends Error {}

function putWithProgress(url: string, headers: Record<string, string>, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v)
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new UploadError('upload.failed')))
    xhr.onerror = () => reject(new UploadError('upload.failed'))
    xhr.send(file)
  })
}

/** presign → direct PUT to R2 → server confirm (size, type, magic bytes). */
export function useR2Upload() {
  const uploading = ref(false)
  const progress = ref(0)

  async function upload(kind: UploadKind, file: File): Promise<ConfirmResponse> {
    const parsed = presignSchema.safeParse({ kind, contentType: file.type, size: file.size, fileName: file.name })
    if (!parsed.success) {
      throw new UploadError(parsed.error.issues[0]?.message ?? 'upload.failed')
    }

    uploading.value = true
    progress.value = 0
    try {
      const presigned = await $fetch<PresignResponse>('/api/uploads/presign', { method: 'POST', body: parsed.data })
      await putWithProgress(presigned.url, presigned.headers, file, (p) => {
        progress.value = p
      })
      try {
        return await $fetch<ConfirmResponse>('/api/uploads/confirm', { method: 'POST', body: { uploadId: presigned.uploadId } })
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        throw new UploadError(status === 422 ? 'upload.rejected' : 'upload.failed')
      }
    } catch (err) {
      if (err instanceof UploadError) {
        throw err
      }
      throw new UploadError('upload.failed')
    } finally {
      uploading.value = false
    }
  }

  return { upload, uploading, progress }
}
