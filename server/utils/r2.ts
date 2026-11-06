import { AwsClient } from 'aws4fetch'
import { SNIFF_BYTES } from './file-signature'

/** Only the public avatar bucket exists: evidence is stored as links, never files. */
export type BucketKind = 'public'

let _client: AwsClient | undefined

function r2Config() {
  const r2 = useRuntimeConfig().r2
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
    throw new Error('R2 credentials are not configured (NUXT_R2_*)')
  }
  return r2
}

function client() {
  if (!_client) {
    const r2 = r2Config()
    _client = new AwsClient({
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      service: 's3',
      region: 'auto'
    })
  }
  return _client
}

export function bucketName(kind: BucketKind): string {
  const r2 = r2Config()
  const name = kind === 'public' ? r2.publicBucket : ''
  if (!name) {
    throw new Error(`R2 ${kind} bucket is not configured`)
  }
  return name
}

function encodeKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('/')
}

function objectUrl(bucket: BucketKind, key: string): URL {
  return new URL(`https://${r2Config().accountId}.r2.cloudflarestorage.com/${bucketName(bucket)}/${encodeKey(key)}`)
}

/** Public URL for an object in the public bucket. */
export function publicUrl(key: string): string {
  const base = r2Config().publicUrl.replace(/\/+$/, '')
  if (!base) {
    throw new Error('NUXT_R2_PUBLIC_URL is not configured')
  }
  return `${base}/${encodeKey(key)}`
}

/** Inverse of publicUrl: returns the key if the URL points into our public bucket. */
export function keyFromPublicUrl(url: string): string | null {
  const base = `${r2Config().publicUrl.replace(/\/+$/, '')}/`
  if (!url.startsWith(base)) {
    return null
  }
  try {
    return url.slice(base.length).split('/').map(decodeURIComponent).join('/')
  } catch {
    return null
  }
}

/**
 * Presigned PUT. content-type and content-length are part of the signature
 * (allHeaders), so R2 rejects an upload whose type or byte size differs from
 * what the server validated. Browsers set Content-Length automatically.
 */
export async function presignPut(opts: { bucket: BucketKind, key: string, contentType: string, size: number, expiresIn: number }) {
  const url = objectUrl(opts.bucket, opts.key)
  url.searchParams.set('X-Amz-Expires', String(opts.expiresIn))
  const signed = await client().sign(url.toString(), {
    method: 'PUT',
    headers: {
      'content-type': opts.contentType,
      'content-length': String(opts.size)
    },
    aws: { signQuery: true, allHeaders: true }
  })
  return {
    url: signed.url,
    // Headers the browser must send. Content-Length is set by the browser.
    headers: { 'Content-Type': opts.contentType }
  }
}

export async function headObject(bucket: BucketKind, key: string): Promise<{ size: number, contentType: string } | null> {
  const res = await client().fetch(objectUrl(bucket, key).toString(), { method: 'HEAD' })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`R2 HEAD failed: ${res.status}`)
  }
  return {
    size: Number(res.headers.get('content-length') ?? '-1'),
    contentType: res.headers.get('content-type') ?? ''
  }
}

/** First bytes of an object, for magic-byte sniffing. */
export async function readHead(bucket: BucketKind, key: string, length = SNIFF_BYTES): Promise<Uint8Array> {
  const res = await client().fetch(objectUrl(bucket, key).toString(), {
    method: 'GET',
    headers: { range: `bytes=0-${length - 1}` }
  })
  if (!res.ok) {
    throw new Error(`R2 range GET failed: ${res.status}`)
  }
  return new Uint8Array(await res.arrayBuffer()).slice(0, length)
}

export async function deleteObject(bucket: BucketKind, key: string): Promise<void> {
  const res = await client().fetch(objectUrl(bucket, key).toString(), { method: 'DELETE' })
  // S3/R2 return 204 for both existing and missing keys.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE failed: ${res.status}`)
  }
}
