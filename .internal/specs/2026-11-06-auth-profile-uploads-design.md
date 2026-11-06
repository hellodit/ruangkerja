# Auth, Profile, R2 Uploads, SingaPay Webhook — Design

Date: 2026-11-06 · Status: Approved

## Goal

Add authentication (email/password + Google), profile management (view, edit,
change photo, change password), document uploads to Cloudflare R2, Cloudflare
Turnstile bot protection, Zod validation everywhere, and a verified, idempotent
SingaPay payment-gateway webhook receiver to the Nuxt 4 + Nuxt UI 4 app.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| UI library | Nuxt UI 4 (already installed). "NextUI/HeroUI" is React-only. |
| Email verification | Optional: sent on sign-up, does not block login, resendable from profile. |
| R2 access | Avatars in a public bucket; documents in a private bucket behind signed GETs. |
| Upload flow | Presigned PUT direct to R2, followed by a server-side confirm step. |
| Turnstile | On sign-in, sign-up and request-password-reset. |
| Deploy target | Node server (Vercel / VPS). Postgres via `postgres` driver, R2 via S3 API. |
| Webhook | SingaPay. Verify + persist + log only; no business logic yet. |

## Out of scope

- Changing the account email (needs its own verification flow).
- Business logic driven by SingaPay events (no order/payment model exists yet).
- Account deletion, 2FA, admin pages.

## Architecture

### Server

- `server/db/schema.ts` — Drizzle schema: Better Auth tables (`user`, `session`,
  `account`, `verification`, `rate_limit`) + `pending_upload`, `document`,
  `singapay_webhook_event`.
- `server/utils/db.ts` — singleton `drizzle(postgres(DATABASE_URL))`.
- `server/utils/auth.ts` — Better Auth instance:
  - `drizzleAdapter(db, { provider: 'pg', schema })`
  - `emailAndPassword`: `minPasswordLength: 8`, `maxPasswordLength: 128`,
    `requireEmailVerification: false`, `sendResetPassword` via Resend,
    `resetPasswordTokenExpiresIn: 3600`, `revokeSessionsOnPasswordReset: true`.
  - `emailVerification`: `sendOnSignUp: true`, `autoSignInAfterVerification: true`.
  - `socialProviders.google` (clientId/secret from env).
  - `account.accountLinking`: enabled, `trustedProviders: ['google']` is NOT set —
    linking relies on Google returning `email_verified`.
  - `plugins: [captcha({ provider: 'cloudflare-turnstile', secretKey, endpoints:
    ['/sign-in/email', '/sign-up/email', '/request-password-reset'] })]`.
  - `rateLimit: { enabled: true, storage: 'database' }`.
  - `trustedOrigins` from `NUXT_PUBLIC_SITE_URL`.
- `server/utils/email.ts` — Resend wrapper; templates for verify + reset.
- `server/api/auth/[...all].ts` — `auth.handler(toWebRequest(event))`.
- `server/utils/session.ts` — `requireUser(event)` → 401 if no session.
- `server/utils/r2.ts` — `aws4fetch` `AwsClient` (service `s3`, region `auto`),
  `presignPut`, `presignGet`, `headObject`, `getRange`, `deleteObject`,
  `publicUrl(key)`.
- `server/utils/file-signature.ts` — magic-byte sniffing for jpeg/png/webp/pdf.
- `server/utils/singapay.ts` — signature verification + body normalization +
  event-type detection.
- `server/api/uploads/presign.post.ts`, `server/api/uploads/confirm.post.ts`
- `server/api/documents/index.get.ts`, `[id]/download.get.ts`, `[id].delete.ts`
- `server/api/webhooks/singapay.post.ts`

### Shared

- `shared/schemas/*.ts` — Zod schemas used by both the forms and the API
  (`auth.ts`, `profile.ts`, `upload.ts`). Nuxt 4 auto-imports from `shared/`.

### Client

- `app/utils/auth-client.ts` — `createAuthClient` from `better-auth/vue`.
- `app/middleware/auth.ts` (protects `/profile/**`), `app/middleware/guest.ts`.
- `app/composables/useR2Upload.ts` — presign → PUT → confirm, with progress.
- Pages: `login`, `register`, `forgot-password`, `reset-password`,
  `verify-email`, `profile/index`, `profile/edit`.
- `app/components/TurnstileWidget` via `@nuxtjs/turnstile` (`<NuxtTurnstile>`),
  token sent as `x-captcha-response` header.
- Header shows Login/Register or a user menu (Profile, Logout).
- All UI strings in `i18n/locales/{id,en}.json`.

## Upload flow

1. `POST /api/uploads/presign` `{ kind: 'avatar'|'document', contentType, size, fileName }`
   - Requires session. Zod: avatar ∈ {jpeg,png,webp} ≤ 2 MB; document ∈ {pdf,jpeg,png} ≤ 10 MB.
   - Key: `avatars/{userId}/{uuid}.{ext}` (public bucket) or
     `documents/{userId}/{uuid}.{ext}` (private bucket). Extension derived from
     contentType, never from the user's file name.
   - Inserts `pending_upload` (`expiresAt = now + 5 min`).
   - Returns `{ uploadId, url, headers }`; signature covers `content-type` and
     `content-length`, URL valid 5 minutes.
2. Browser `PUT url` with those headers.
3. `POST /api/uploads/confirm` `{ uploadId }`
   - Pending row must belong to the user, not expired, not consumed.
   - `HEAD` object: size and content-type must match the pending row.
   - Range GET `bytes=0-15`: magic bytes must match contentType.
   - On any mismatch: delete the object, mark the pending row consumed, 422.
   - Avatar: set `user.image = publicUrl(key)`, delete the previous avatar object
     if it lives under `avatars/{userId}/`.
   - Document: insert `document` row (`name` = sanitized original file name).
   - Marks pending row consumed (single use; enforced with conditional UPDATE).
4. `GET /api/documents/:id/download` — owner check, returns `{ url }` (5-min
   signed GET with `response-content-disposition: attachment`).
5. `DELETE /api/documents/:id` — owner check, delete object then row.

Bucket setup (documented in README): CORS allowing `PUT` from the app origin
with `content-type` header on both buckets; public custom domain (or r2.dev) on
the public bucket → `R2_PUBLIC_URL`.

## SingaPay webhook

`POST /api/webhooks/singapay`

- Read raw body (`readRawBody(event, 'utf8')`).
- Required headers: `X-Signature`, `X-Timestamp` (Unix seconds, digits only),
  `Authorization: Bearer <token>`. Missing → 401.
- `|now - timestamp| ≤ 300` else 401.
- `stringToSign = "POST:{path+query}:{token}:{sha256hex(body)}:{timestamp}"`,
  `expected = hex(HMAC-SHA512(stringToSign, secret))`.
- Body hash candidates: (a) normalized JSON (recursive key sort in byte order,
  lists keep order, compact, unescaped unicode/slashes), (b) raw bytes.
  Compared with `timingSafeEqual`. Secrets: `SINGAPAY_WEBHOOK_SECRET` (comma
  separated list allowed for rotation).
- Invalid JSON → 400.
- Idempotency: insert `singapay_webhook_event { eventId: sha256(rawBody),
  eventType, payload }`; on unique conflict → 200 `{ received: true, duplicate: true }`
  (stale unprocessed claim > 5 min is reclaimed once). Processing hook
  `handleSingapayEvent()` is a logged no-op for now; on throw the claim is
  deleted and 500 returned so SingaPay retries. On success set `processedAt`.
- Event type from `event` field (`_`→`-` normalized), payment-link fallback via
  `data.transaction.type === 'pl'` or `data.payment.method === 'payment_link'`.

**Risk:** the scheme is derived from the third-party `aliziodev/laravel-singapay`
SDK, not official SingaPay docs. Must be validated against the SingaPay sandbox
before production. Known normalization edge: PHP re-encodes whole floats as
`100000.0` and escapes U+2028/2029; the raw-body fallback covers gateways that
sign raw bytes.

## Environment variables (`.env.example`)

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NUXT_PUBLIC_SITE_URL`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
`NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `NUXT_TURNSTILE_SECRET_KEY`,
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_URL`,
`SINGAPAY_WEBHOOK_SECRET`.

## Security

- Zod validation on server for every endpoint; client forms reuse the same schemas.
- Forgot-password response identical whether or not the email exists (Better Auth default).
- Session cookies httpOnly + secure in production (Better Auth default).
- Object keys are server-generated; users never control paths.
- Ownership enforced on every document/upload operation.
- No secrets in client bundle; only `NUXT_PUBLIC_*` reach the browser.

## Testing

- Vitest unit tests: Zod schemas, SingaPay verifier (generated vectors incl.
  key-order variance, stale timestamp, wrong secret), magic-byte sniffing.
- `bun run lint`, `bun run typecheck`, `bun run build` must pass.
- E2E against real services requires credentials not available in the build
  session; manual verification steps listed in README.
