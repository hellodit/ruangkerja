# Auth, Profile, R2 Uploads, SingaPay Webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.
>
> Note: `bd` is not installed in this environment; tracking falls back to this file's checkboxes.

**Spec:** `.internal/specs/2026-11-06-auth-profile-uploads-design.md`

**Goal:** Email/password + Google auth with Turnstile, profile view/edit/photo/password, private document uploads to R2 via presigned URLs, and a verified idempotent SingaPay webhook — all Zod-validated.

**Architecture:** Better Auth (drizzle/pg adapter) mounted at `/api/auth/**`; shared Zod schemas in `shared/schemas`; R2 via `aws4fetch` presigning with a server confirm step that sniffs magic bytes; SingaPay HMAC-SHA512 verification over normalized body with a DB idempotency ledger.

**Tech Stack:** Nuxt 4.6, Nuxt UI 4.12, Better Auth 1.7.17, Drizzle 0.45 + postgres 4, Zod 4.6, Resend 6, aws4fetch 1.0, @nuxtjs/turnstile 1.1, Vitest 5.

## Global Constraints

- Avatar: `image/jpeg|image/png|image/webp`, ≤ 2 MB (2_097_152 bytes). Document: `application/pdf|image/jpeg|image/png`, ≤ 10 MB (10_485_760 bytes).
- Presigned URLs and pending uploads expire after 300 s.
- Password length 8–128. Name 2–80 chars, trimmed.
- SingaPay timestamp tolerance 300 s; HMAC-SHA512 lowercase hex; constant-time compare.
- Turnstile on `/sign-in/email`, `/sign-up/email`, `/request-password-reset`.
- Every UI string goes through i18n (`id` default, `en`).
- ESLint stylistic: no trailing commas, 1tbs braces; `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` must pass.
- No secret reaches the client; only `NUXT_PUBLIC_*` runtime config is public.

## File Map

| File | Responsibility |
|---|---|
| `shared/schemas/auth.ts` | signIn/signUp/forgot/reset Zod schemas |
| `shared/schemas/profile.ts` | updateProfile / changePassword schemas |
| `shared/schemas/upload.ts` | upload rules, presign/confirm schemas, `extensionFor()` |
| `server/db/schema.ts` | Drizzle tables |
| `server/utils/db.ts` | `useDb()` singleton |
| `server/utils/auth.ts` | Better Auth instance `auth` |
| `server/utils/email.ts` | `sendEmail()`, templates |
| `server/utils/session.ts` | `requireUser(event)` |
| `server/utils/r2.ts` | R2 presign/head/range/delete/publicUrl |
| `server/utils/file-signature.ts` | `sniffMime(bytes)` / `matchesMime()` |
| `server/utils/singapay.ts` | `normalizeBody`, `computeSignature`, `verifySingapaySignature`, `detectEventType` |
| `server/api/auth/[...all].ts` | Better Auth handler |
| `server/api/uploads/presign.post.ts`, `confirm.post.ts` | upload flow |
| `server/api/documents/*` | list/download/delete |
| `server/api/webhooks/singapay.post.ts` | webhook |
| `app/utils/auth-client.ts` | Better Auth Vue client |
| `app/middleware/auth.ts`, `guest.ts` | route guards |
| `app/composables/useR2Upload.ts` | client upload flow |
| `app/pages/{login,register,forgot-password,reset-password,verify-email}.vue` | auth pages |
| `app/pages/profile/{index,edit}.vue` | profile pages |
| `app/components/UserMenu.vue`, `DocumentList.vue`, `AvatarUploader.vue` | UI parts |
| `tests/unit/*.test.ts` | Vitest unit tests |

---

### Task 1: Tooling, env, shared Zod schemas

**Files:** Modify `package.json` (script `test: vitest run`), `nuxt.config.ts` (runtimeConfig, turnstile module); Create `.env.example`, `vitest.config.ts`, `shared/schemas/{auth,profile,upload}.ts`, `tests/unit/schemas.test.ts`.

**Interfaces — Produces:**
- `signInSchema`, `signUpSchema` (`name,email,password,confirmPassword` with refine), `forgotPasswordSchema`, `resetPasswordSchema`, `updateProfileSchema`, `changePasswordSchema`.
- `UPLOAD_RULES: Record<'avatar'|'document', { bucket: 'public'|'private', maxSize: number, mimeTypes: readonly string[] }>`
- `presignSchema` (`kind, contentType, size, fileName`) with superRefine against `UPLOAD_RULES`; `confirmSchema` (`uploadId: uuid`).
- `extensionFor(mime: string): string`.

**Acceptance Criteria:** schemas reject short passwords, mismatched confirm, oversize/wrong-type uploads; accept valid input; `bun run test` passes.

- [ ] Write `tests/unit/schemas.test.ts` (cases above) → run, expect FAIL (module missing)
- [ ] Implement schemas → run, expect PASS
- [ ] Commit

### Task 2: Database schema + Better Auth server + email

**Files:** Create `server/db/schema.ts`, `server/utils/{db,auth,email,session}.ts`, `server/api/auth/[...all].ts`, `drizzle.config.ts`, `server/db/migrations/*` (via `drizzle-kit generate`).

**Interfaces — Produces:** `useDb()`, `auth` (Better Auth), `requireUser(event): Promise<{ id, email, name, image }>`, tables `user, session, account, verification, rateLimit, pendingUpload, document, singapayWebhookEvent`.

**Acceptance Criteria:** `drizzle-kit generate` produces a migration; typecheck passes; config matches spec §Server (captcha endpoints, reset expiry 3600, revoke on reset, optional verification, Google, DB rate limit).

- [ ] Write schema, db, email, auth, session, handler
- [ ] `bunx drizzle-kit generate` → migration file created
- [ ] `bun run typecheck` → PASS
- [ ] Commit

### Task 3: File signature sniffing + R2 utility

**Files:** Create `server/utils/file-signature.ts`, `server/utils/r2.ts`, `tests/unit/file-signature.test.ts`.

**Interfaces — Produces:** `sniffMime(bytes: Uint8Array): string | null`, `matchesMime(bytes, mime): boolean`; `presignPut({ bucket, key, contentType, size }) → { url, headers }`, `presignGet({ bucket, key, fileName }) → string`, `headObject(bucket,key) → { size, contentType } | null`, `getRange(bucket,key,0,15) → Uint8Array`, `deleteObject(bucket,key)`, `publicUrl(key)`, `bucketName('public'|'private')`.

**Acceptance Criteria:** sniffing identifies jpeg (`FF D8 FF`), png (`89 50 4E 47 0D 0A 1A 0A`), webp (`RIFF....WEBP`), pdf (`%PDF-`); rejects a `.png` that is really HTML.

- [ ] Write failing tests → FAIL
- [ ] Implement → PASS
- [ ] Commit

### Task 4: Upload + document API

**Files:** Create `server/api/uploads/presign.post.ts`, `server/api/uploads/confirm.post.ts`, `server/api/documents/index.get.ts`, `server/api/documents/[id]/download.get.ts`, `server/api/documents/[id].delete.ts`.

**Acceptance Criteria:** all endpoints 401 without session; presign validates via `presignSchema` and stores pending row; confirm enforces owner + TTL + single-use (conditional `UPDATE ... WHERE consumedAt IS NULL RETURNING`), HEAD size/type match, magic bytes, deletes object on failure (422); avatar confirm updates `user.image` and deletes previous own avatar; documents scoped to owner (404 otherwise).

- [ ] Implement endpoints
- [ ] typecheck + lint → PASS
- [ ] Commit

### Task 5: SingaPay webhook

**Files:** Create `server/utils/singapay.ts`, `server/api/webhooks/singapay.post.ts`, `tests/unit/singapay.test.ts`.

**Interfaces — Produces:** `normalizeBody(raw: string): string`, `sha256Hex(s)`, `computeSignature({ method, path, token, bodyHash, timestamp, secret }): string`, `verifySingapaySignature({ rawBody, headers, path, secrets, now?, toleranceSeconds? }): { ok: true } | { ok: false, reason }`, `detectEventType(payload): string | null`.

**Test vectors:** sign a body with keys in sorted order and verify a delivery whose raw body has keys unsorted (normalized match); raw-body fallback; wrong secret → `invalid_signature`; timestamp 301 s old → `stale_timestamp`; missing header → `missing_headers`; second secret in rotation list verifies; `detectEventType` maps `transaction_expiration` → `transaction-expiration` and payment-link fallback.

**Acceptance Criteria:** tests pass; endpoint returns 401 on verification failure, 400 on invalid JSON, 200 `{received:true}` first time and `{received:true,duplicate:true}` on replay; claim released + 500 when handler throws.

- [ ] Write failing tests → FAIL
- [ ] Implement util → PASS
- [ ] Implement endpoint, typecheck
- [ ] Commit

### Task 6: Client auth: client, middleware, auth pages, header menu, i18n

**Files:** Create `app/utils/auth-client.ts`, `app/middleware/{auth,guest}.ts`, `app/pages/{login,register,forgot-password,reset-password,verify-email}.vue`, `app/components/UserMenu.vue`; Modify `app/app.vue`, `i18n/locales/{id,en}.json`, `app/pages/index.vue` (branding only if needed).

**Acceptance Criteria:** forms use shared Zod schemas via `UAuthForm`; Turnstile token sent as `x-captcha-response` header and widget reset after each attempt; Google button calls `signIn.social({ provider: 'google', callbackURL: '/profile' })`; forgot password shows the same success message regardless of email; reset page reads `token` and handles `error=INVALID_TOKEN`; header shows login/register or user menu.

- [ ] Implement
- [ ] lint + typecheck → PASS
- [ ] Commit

### Task 7: Profile pages + uploads UI

**Files:** Create `app/composables/useR2Upload.ts`, `app/components/{AvatarUploader,DocumentList}.vue`, `app/pages/profile/{index,edit}.vue`.

**Acceptance Criteria:** `/profile` shows avatar, name, email, verified badge + resend verification button, documents list (upload/download/delete); `/profile/edit` updates name (`authClient.updateUser`), uploads photo, changes password (hidden if no credential account — `authClient.listAccounts()`); client-side validation mirrors server; errors surface via `useToast`.

- [ ] Implement
- [ ] lint + typecheck + build → PASS
- [ ] Commit

### Task 8: Docs + final verification

**Files:** Modify `README.md` (setup: env, DB migrate, Google OAuth redirect URI `{BASE}/api/auth/callback/google`, Turnstile keys, R2 buckets + CORS JSON + public domain, Resend domain, SingaPay callback URL + sandbox validation warning), `.github/workflows/ci.yml` (add test step).

**Acceptance Criteria:** README covers every env var in `.env.example`; CI runs tests; lint, typecheck, test, build all green.

- [ ] Write docs, update CI
- [ ] Run full verification
- [ ] Commit + push

## Spec coverage

Auth (T2, T6) · optional verification (T2, T7) · Google (T2, T6) · Turnstile (T2, T6) · profile/edit/photo/password (T7) · presigned R2 + confirm + magic bytes (T3, T4, T7) · public avatar / private docs (T3, T4) · SingaPay verify/idempotency/type detection (T5) · Zod everywhere (T1 + all) · env + README (T1, T8) · tests (T1, T3, T5, T8). Out-of-scope items per spec are not planned.
