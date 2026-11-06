import { Resend } from 'resend'

let _resend: Resend | undefined

function useResend() {
  if (!_resend) {
    const key = useRuntimeConfig().resendApiKey
    if (!key) {
      throw new Error('NUXT_RESEND_API_KEY is not set')
    }
    _resend = new Resend(key)
  }
  return _resend
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ActionEmail {
  to: string
  subject: string
  greetingName: string
  intro: string
  actionLabel: string
  actionUrl: string
  outro: string
}

function renderActionEmail(e: ActionEmail) {
  const name = escapeHtml(e.greetingName)
  const url = escapeHtml(e.actionUrl)
  const html = `<!doctype html>
<html lang="id"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<p>Halo ${name},</p>
<p>${escapeHtml(e.intro)}</p>
<p style="margin:32px 0"><a href="${url}" style="background:#00a155;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(e.actionLabel)}</a></p>
<p style="font-size:13px;color:#475569">Jika tombol tidak berfungsi, salin tautan ini ke browser Anda:<br><span style="word-break:break-all">${url}</span></p>
<p style="font-size:13px;color:#475569">${escapeHtml(e.outro)}</p>
<p>— Ruang Kerja</p>
</body></html>`
  const text = `Halo ${e.greetingName},\n\n${e.intro}\n\n${e.actionLabel}: ${e.actionUrl}\n\n${e.outro}\n\n— Ruang Kerja`
  return { html, text }
}

async function sendActionEmail(e: ActionEmail) {
  const { html, text } = renderActionEmail(e)
  const { error } = await useResend().emails.send({
    from: useRuntimeConfig().emailFrom,
    to: e.to,
    subject: e.subject,
    html,
    text
  })
  if (error) {
    // Do not leak provider details to the client; log for operators.
    console.error('[email] send failed', { subject: e.subject, error: error.message })
    throw new Error('Failed to send email')
  }
}

export function sendVerificationEmail(to: string, name: string, url: string) {
  return sendActionEmail({
    to,
    subject: 'Verifikasi email Anda — Ruang Kerja',
    greetingName: name,
    intro: 'Terima kasih telah mendaftar. Klik tombol di bawah untuk memverifikasi alamat email Anda.',
    actionLabel: 'Verifikasi email',
    actionUrl: url,
    outro: 'Jika Anda tidak merasa mendaftar, abaikan email ini.'
  })
}

export function sendResetPasswordEmail(to: string, name: string, url: string) {
  return sendActionEmail({
    to,
    subject: 'Atur ulang kata sandi — Ruang Kerja',
    greetingName: name,
    intro: 'Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Tautan ini berlaku selama 1 jam.',
    actionLabel: 'Atur ulang kata sandi',
    actionUrl: url,
    outro: 'Jika Anda tidak meminta ini, abaikan email ini. Kata sandi Anda tidak akan berubah.'
  })
}
