import { presignSchema, type UploadKind } from '#shared/schemas/upload'

interface PresignResponse {
  uploadId: string
  url: string
  headers: Record<string, string>
  expiresIn: number
}

interface ConfirmResponse {
  image: string
}

/** Error with a user-facing (Indonesian) message. */
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
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new UploadError('Gagal mengunggah file')))
    xhr.onerror = () => reject(new UploadError('Gagal mengunggah file'))
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
      throw new UploadError(parsed.error.issues[0]?.message ?? 'Gagal mengunggah file')
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
        throw new UploadError(status === 422 ? 'File ditolak karena isinya tidak sesuai dengan jenisnya' : 'Gagal mengunggah file')
      }
    } catch (err) {
      if (err instanceof UploadError) {
        throw err
      }
      throw new UploadError('Gagal mengunggah file')
    } finally {
      uploading.value = false
    }
  }

  return { upload, uploading, progress }
}
