# RuangKerja Rilis 1.0 — Design & Plan

Date: 2026-11-06 · Status: Approved (user: "kerjakan sampai selesai")

Sources: PRD "PRD Ruang Kerja ASN" (Claude Docs), canvas "UI Ruang Kerja ASN",
design system "CTM Project". App name: **RuangKerja**. Built on top of
`feat/auth-profile-uploads` (PR #1).

## Decisions

| Topic | Decision |
|---|---|
| Scope | Rilis 1.0 = MVP 1–4 + akun. AI (rapikan kalimat, draf AI), Alat bantu, pembayaran → out (Rilis 1.1 / fase 2). |
| UI | Nuxt UI 4 components only (`UDashboard*`, `UForm`, `UTable`, `UModal`, `UStepper`, `UAccordion`, …), themed with CTM tokens. |
| Email verification | Optional (user decision, deviates from PRD AKN-02). |
| File upload | Only profile photo (R2). Document upload removed (PRD: bukti = nama + tautan). |
| Auth tables | Plural (`users`, `sessions`, `accounts`, `verifications`), UUID ids, additionalFields `timezone`, `onboardingCompletedAt`. Magic link added (AKN-03). Google kept. |
| i18n | Indonesian only; `@nuxtjs/i18n` removed (product targets ASN, e-Kinerja terms kept verbatim). |
| Realisasi draft | Deterministic, composed only from progress entries (no AI); plans without progress are flagged and excluded (RLS-02). |
| Sensitive data | `nip`, `birth_date`, `address` encrypted at rest (AES-256-GCM, `NUXT_DATA_ENCRYPTION_KEY`). |
| Delete RHK / rencana aksi | Soft delete; children hidden through joins (open question in PRD; reversible). |
| Ekspor | Real `.docx` via `docx` library, with independence statement. |
| Reminders | Settings stored; delivery channel is an open PRD question → not sent yet. |
| Mobile | Responsive via `UDashboardSidebar` drawer; dedicated mobile design later (PRD). |

## Theme mapping (CTM → Nuxt UI)

- `primary` = brand gold scale (`c-brand-50…950`), `--ui-primary` = brand-400 `#ECBD56`; text/icons on primary = ink `#111216`.
- `neutral` = slate. Semantic: success green, warning amber, error red, info blue.
- Font Rethink Sans (UI), JetBrains Mono (times/IDs), self-hosted from the design system.
- `--ui-radius: 0.5rem` → button 8, input 12, card 16.

## Data model

As PRD "Rancangan database": users/sessions/accounts/verifications, profiles,
user_settings, skps, evaluation_periods, rhks, rhk_indicators, action_plans,
daily_progress, progress_results, ai_suggestions (schema only), period_realizations,
realization_sources. Derived values computed on read.

## Routes

`/login /register /forgot-password /reset-password /verify-email`,
`/onboarding/{profil,rhk,ringkasan}`, `/beranda`, `/rhk`, `/rhk/[id]`,
`/progres` (daftar|kalender), `/progres/tambah`, `/progres/[id]`, `/bukti`,
`/realisasi`, `/profil`.

## Plan (tasks)

1. Theme, fonts, layout shell (sidebar), remove i18n + documents feature.
2. Schema + Better Auth reconfig + migrations + domain utils (periods, derived, copy text, crypto) with unit tests.
3. API: profile/settings/onboarding, SKP/periods, RHK + indicators, action plans, progress + results, evidence, dashboard, realization + docx, account export/delete.
4. Pages: auth, onboarding (3 steps), beranda, RHK list/detail, progres list/calendar/form, bukti, realisasi, profil.
5. Seed demo data, README, verification (lint, typecheck, tests, build, smoke test).
