/** Human message from a $fetch / useFetch error. */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string, statusCode?: number }
  if (e?.statusCode === 400) {
    return 'Periksa kembali isian Anda.'
  }
  const msg = e?.data?.statusMessage ?? e?.statusMessage
  return msg && !/^(Bad Request|Internal Server Error|Unauthorized)$/i.test(msg) ? msg : fallback
}

export function useNotify() {
  const toast = useToast()
  return {
    success: (title: string, description?: string) => toast.add({ title, description, color: 'success', icon: 'i-ctm-checkmark-circle' }),
    error: (err: unknown, fallback?: string) => toast.add({ title: apiErrorMessage(err, fallback), color: 'error', icon: 'i-ctm-alert-circle' })
  }
}

/** Copy to clipboard with a toast (Salin untuk e-Kinerja etc.). */
export function useCopyText() {
  const toast = useToast()
  return async (text: string, title = 'Teks disalin') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title, description: 'Tempel di e-Kinerja.', color: 'success', icon: 'i-ctm-check' })
      return true
    } catch {
      toast.add({ title: 'Gagal menyalin', description: 'Izinkan akses clipboard di browser.', color: 'error' })
      return false
    }
  }
}
