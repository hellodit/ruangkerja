/**
 * SingaPay webhook verification. Pure module (no Nuxt globals) so it can be
 * unit tested.
 *
 *   string_to_sign = "POST:{path}:{token}:{sha256hex(body)}:{X-Timestamp}"
 *   X-Signature    = hex(HMAC-SHA512(string_to_sign, secret))
 *
 * `token` is the bearer token SingaPay sends in `Authorization`. The body hash
 * is computed over the body re-normalized the way SingaPay's official PHP
 * sample does it (json_decode assoc → recursive ksort(SORT_STRING) →
 * json_encode(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); a hash of the
 * raw bytes is accepted as a fallback.
 *
 * Source: third-party SDK aliziodev/laravel-singapay (no public official docs).
 * Validate against the SingaPay sandbox before going live.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// ---------------------------------------------------------------------------
// PHP-compatible JSON normalization
// ---------------------------------------------------------------------------

/** A decoded value with PHP json_decode(assoc=true) semantics. */
type PhpValue
  = | { t: 'str', v: string }
    | { t: 'int', v: bigint }
    | { t: 'float', v: number }
    | { t: 'bool', v: boolean }
    | { t: 'null' }
    | { t: 'arr', entries: Array<[string, PhpValue]> }

const INT64_MIN = -(2n ** 63n)
const INT64_MAX = 2n ** 63n - 1n

class JsonParser {
  private i = 0
  constructor(private readonly s: string) {}

  parse(): PhpValue {
    const v = this.value()
    this.ws()
    if (this.i !== this.s.length) {
      this.fail('trailing characters')
    }
    return v
  }

  private fail(msg: string): never {
    throw new SyntaxError(`Invalid JSON at ${this.i}: ${msg}`)
  }

  private ws() {
    while (this.i < this.s.length && ' \t\n\r'.includes(this.s[this.i]!)) {
      this.i++
    }
  }

  private value(): PhpValue {
    this.ws()
    const c = this.s[this.i]
    if (c === '{') {
      return this.object()
    }
    if (c === '[') {
      return this.array()
    }
    if (c === '"') {
      return { t: 'str', v: this.string() }
    }
    if (c === '-' || (c !== undefined && c >= '0' && c <= '9')) {
      return this.number()
    }
    for (const [lit, val] of [['true', { t: 'bool', v: true }], ['false', { t: 'bool', v: false }], ['null', { t: 'null' }]] as const) {
      if (this.s.startsWith(lit, this.i)) {
        this.i += lit.length
        return val
      }
    }
    return this.fail('unexpected token')
  }

  private object(): PhpValue {
    this.i++
    const map = new Map<string, PhpValue>()
    this.ws()
    if (this.s[this.i] === '}') {
      this.i++
      return { t: 'arr', entries: [] }
    }
    for (;;) {
      this.ws()
      if (this.s[this.i] !== '"') {
        this.fail('expected key')
      }
      const key = phpArrayKey(this.string())
      this.ws()
      if (this.s[this.i++] !== ':') {
        this.fail('expected :')
      }
      // PHP overwrites duplicates in place (insertion position kept).
      map.set(key, this.value())
      this.ws()
      const c = this.s[this.i++]
      if (c === '}') {
        break
      }
      if (c !== ',') {
        this.fail('expected , or }')
      }
    }
    return { t: 'arr', entries: [...map.entries()] }
  }

  private array(): PhpValue {
    this.i++
    const entries: Array<[string, PhpValue]> = []
    this.ws()
    if (this.s[this.i] === ']') {
      this.i++
      return { t: 'arr', entries }
    }
    for (;;) {
      entries.push([String(entries.length), this.value()])
      this.ws()
      const c = this.s[this.i++]
      if (c === ']') {
        break
      }
      if (c !== ',') {
        this.fail('expected , or ]')
      }
    }
    return { t: 'arr', entries }
  }

  private string(): string {
    const start = this.i
    this.i++
    for (;;) {
      const c = this.s[this.i]
      if (c === undefined) {
        this.fail('unterminated string')
      }
      if (c === '\\') {
        this.i += 2
        continue
      }
      this.i++
      if (c === '"') {
        break
      }
    }
    // Delegate escape decoding to the platform parser (validates too).
    return JSON.parse(this.s.slice(start, this.i)) as string
  }

  private number(): PhpValue {
    const m = /^-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(this.s.slice(this.i))
    if (!m) {
      this.fail('bad number')
    }
    const raw = m[0]
    this.i += raw.length
    if (m[1] === undefined && m[2] === undefined) {
      const big = BigInt(raw)
      if (big >= INT64_MIN && big <= INT64_MAX) {
        return { t: 'int', v: big }
      }
    }
    return { t: 'float', v: Number(raw) }
  }
}

/** PHP converts canonical decimal-integer string keys to int keys. */
function phpArrayKey(key: string): string {
  if (/^(?:0|-?[1-9]\d*)$/.test(key)) {
    const big = BigInt(key)
    if (big >= INT64_MIN && big <= INT64_MAX) {
      return big.toString()
    }
  }
  return key
}

const utf8 = new TextEncoder()

/** ksort(SORT_STRING): byte-wise comparison of keys. */
function compareBytes(a: string, b: string): number {
  return Buffer.compare(Buffer.from(utf8.encode(a)), Buffer.from(utf8.encode(b)))
}

/** PHP float → string with serialize_precision = -1. */
function phpFloat(x: number): string {
  if (!Number.isFinite(x)) {
    throw new RangeError('Non-finite number')
  }
  if (x === 0) {
    return Object.is(x, -0) ? '-0' : '0'
  }
  const sign = x < 0 ? '-' : ''
  const [mantissa, expPart] = Math.abs(x).toExponential().split('e') as [string, string]
  const digits = mantissa.replace('.', '')
  const exp = Number(expPart)
  const decpt = exp + 1

  if (decpt < -3 || decpt > 17) {
    const frac = digits.slice(1) || '0'
    return `${sign}${digits[0]}.${frac}e${exp < 0 ? '-' : '+'}${Math.abs(exp)}`
  }
  if (decpt <= 0) {
    return `${sign}0.${'0'.repeat(-decpt)}${digits}`
  }
  if (digits.length <= decpt) {
    return `${sign}${digits}${'0'.repeat(decpt - digits.length)}`
  }
  return `${sign}${digits.slice(0, decpt)}.${digits.slice(decpt)}`
}

const LINE_SEPARATOR = String.fromCharCode(0x2028)
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029)

function phpString(s: string): string {
  // JSON.stringify already matches PHP for quotes, backslash, control chars
  // (lowercase \u00xx) and leaves "/" and non-ASCII alone. PHP additionally
  // escapes the JS line terminators.
  return JSON.stringify(s)
    .replaceAll(LINE_SEPARATOR, '\\u2028')
    .replaceAll(PARAGRAPH_SEPARATOR, '\\u2029')
}

function encode(v: PhpValue): string {
  switch (v.t) {
    case 'str': return phpString(v.v)
    case 'int': return v.v.toString()
    case 'float': return phpFloat(v.v)
    case 'bool': return v.v ? 'true' : 'false'
    case 'null': return 'null'
    case 'arr': {
      const sorted = [...v.entries].sort(([a], [b]) => compareBytes(a, b))
      const isList = sorted.every(([k], i) => k === String(i))
      if (isList) {
        return `[${sorted.map(([, val]) => encode(val)).join(',')}]`
      }
      return `{${sorted.map(([k, val]) => `${phpString(k)}:${encode(val)}`).join(',')}}`
    }
  }
}

/** Normalize a raw JSON body exactly like SingaPay's PHP verification sample. */
export function normalizeBody(raw: string): string {
  return encode(new JsonParser(raw).parse())
}

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

export function computeSignature(o: { method: string, path: string, token: string, bodyHash: string, timestamp: string, secret: string }): string {
  const stringToSign = `${o.method}:${o.path}:${o.token}:${o.bodyHash}:${o.timestamp}`
  return createHmac('sha512', o.secret).update(stringToSign, 'utf8').digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export type VerifyResult
  = | { ok: true }
    | { ok: false, reason: 'not_configured' | 'missing_headers' | 'stale_timestamp' | 'invalid_body' | 'invalid_signature' }

export interface VerifyInput {
  rawBody: string
  /** Lower-cased header names. */
  headers: Record<string, string | undefined>
  /** Callback path including query string, e.g. "/api/webhooks/singapay". */
  path: string
  secrets: string[]
  /** Unix seconds; injectable for tests. */
  now?: number
  toleranceSeconds?: number
}

export function verifySingapaySignature(input: VerifyInput): VerifyResult {
  const secrets = input.secrets.map(s => s.trim()).filter(Boolean)
  if (secrets.length === 0) {
    return { ok: false, reason: 'not_configured' }
  }

  const signature = input.headers['x-signature']?.trim().toLowerCase()
  const timestamp = input.headers['x-timestamp']?.trim()
  const authorization = input.headers.authorization?.trim()
  if (!signature || !timestamp || !authorization || !/^\d{1,12}$/.test(timestamp)) {
    return { ok: false, reason: 'missing_headers' }
  }
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) {
    return { ok: false, reason: 'missing_headers' }
  }

  const now = input.now ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - Number(timestamp)) > (input.toleranceSeconds ?? 300)) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  let normalized: string
  try {
    normalized = normalizeBody(input.rawBody)
  } catch {
    return { ok: false, reason: 'invalid_body' }
  }

  const bodyHashes = [...new Set([sha256Hex(normalized), sha256Hex(input.rawBody)])]
  // Evaluate every candidate (no early exit) to keep timing uniform.
  let matched = false
  for (const bodyHash of bodyHashes) {
    for (const secret of secrets) {
      const expected = computeSignature({ method: 'POST', path: input.path, token, bodyHash, timestamp, secret })
      if (safeEqualHex(expected, signature)) {
        matched = true
      }
    }
  }
  return matched ? { ok: true } : { ok: false, reason: 'invalid_signature' }
}

// ---------------------------------------------------------------------------
// Event type detection
// ---------------------------------------------------------------------------

export const SINGAPAY_EVENT_TYPES = [
  'va-transaction',
  'qris-acquirer-transaction',
  'payment-link-transaction',
  'ewallet-native-transaction',
  'subscription-cycle',
  'disbursement',
  'ewallet-topup',
  'qris-issuer',
  'settlement',
  'direct-debit',
  'payment-link-inquiry',
  'product-expiration',
  'transaction-expiration'
] as const

export type SingapayEventType = typeof SINGAPAY_EVENT_TYPES[number]

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function dig(obj: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((acc, k) => (isRecord(acc) ? acc[k] : undefined), obj)
}

export function detectEventType(payload: unknown): SingapayEventType | null {
  const event = dig(payload, 'event')
  if (typeof event === 'string' && event) {
    const known = SINGAPAY_EVENT_TYPES as readonly string[]
    const normalized = event.replace(/_/g, '-')
    if (known.includes(event)) {
      return event as SingapayEventType
    }
    if (known.includes(normalized)) {
      return normalized as SingapayEventType
    }
    if (event.startsWith('subscription.')) {
      return 'subscription-cycle'
    }
    if (event.startsWith('settlement.')) {
      return 'settlement'
    }
    if (event.startsWith('payment_link.inquiry')) {
      return 'payment-link-inquiry'
    }
    if (event.startsWith('direct-debit') || event.startsWith('direct_debit')) {
      return 'direct-debit'
    }
  }
  if (dig(payload, 'data', 'transaction', 'type') === 'pl' || dig(payload, 'data', 'payment', 'method') === 'payment_link') {
    return 'payment-link-transaction'
  }
  return null
}
