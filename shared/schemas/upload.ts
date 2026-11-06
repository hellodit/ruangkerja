import { z } from 'zod'

export const UPLOAD_KINDS = ['avatar', 'document'] as const
export type UploadKind = typeof UPLOAD_KINDS[number]

export interface UploadRule {
  bucket: 'public' | 'private'
  maxSize: number
  mimeTypes: readonly string[]
}

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  avatar: {
    bucket: 'public',
    maxSize: 2 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  document: {
    bucket: 'private',
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
  }
}

/** Seconds a presigned URL and its pending upload stay valid. */
export const UPLOAD_TTL_SECONDS = 300

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
}

export function extensionFor(mime: string): string {
  const ext = EXTENSIONS[mime]
  if (!ext) {
    throw new Error(`Unsupported mime type: ${mime}`)
  }
  return ext
}

export const presignSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
  fileName: z.string().trim().min(1).max(255)
}).superRefine((d, ctx) => {
  const rule = UPLOAD_RULES[d.kind]
  if (!rule.mimeTypes.includes(d.contentType)) {
    ctx.addIssue({ code: 'custom', path: ['contentType'], message: 'upload.invalidType' })
  }
  if (d.size > rule.maxSize) {
    ctx.addIssue({ code: 'custom', path: ['size'], message: 'upload.tooLarge' })
  }
})

export const confirmSchema = z.object({
  uploadId: z.uuid()
})

export type PresignInput = z.output<typeof presignSchema>
export type ConfirmInput = z.output<typeof confirmSchema>

/** Keep a user-supplied file name safe for display and Content-Disposition. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKC')
    .replace(/[\\/]/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F"<>|:*?]/g, '')
    .trim()
  return (cleaned || 'file').slice(0, 200)
}
