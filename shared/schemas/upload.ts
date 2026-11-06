import { z } from 'zod'

export const UPLOAD_KINDS = ['avatar'] as const
export type UploadKind = typeof UPLOAD_KINDS[number]

export interface UploadRule {
  maxSize: number
  mimeTypes: readonly string[]
}

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  avatar: {
    maxSize: 2 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
}

/** Seconds a presigned URL and its pending upload stay valid. */
export const UPLOAD_TTL_SECONDS = 300

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
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
  fileName: z.string().trim().min(1).max(255).optional()
}).superRefine((d, ctx) => {
  const rule = UPLOAD_RULES[d.kind]
  if (!rule.mimeTypes.includes(d.contentType)) {
    ctx.addIssue({ code: 'custom', path: ['contentType'], message: 'Jenis file tidak didukung' })
  }
  if (d.size > rule.maxSize) {
    ctx.addIssue({ code: 'custom', path: ['size'], message: 'Ukuran file melebihi batas' })
  }
})

export const confirmSchema = z.object({
  uploadId: z.uuid()
})

export type PresignInput = z.output<typeof presignSchema>
export type ConfirmInput = z.output<typeof confirmSchema>
