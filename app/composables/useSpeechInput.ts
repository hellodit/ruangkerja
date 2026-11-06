/**
 * Voice-to-text with the browser's built-in speech recognition (id-ID).
 * Text input stays available when the browser does not support it.
 */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number, results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

export function useSpeechInput(onText: (text: string) => void) {
  const supported = ref(false)
  const listening = ref(false)
  const error = ref('')
  let rec: SpeechRecognitionLike | null = null

  onMounted(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike, webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    supported.value = !!Ctor
    if (!Ctor) {
      return
    }
    rec = new Ctor()
    rec.lang = 'id-ID'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!
        if (r.isFinal) {
          onText(r[0]!.transcript.trim())
        }
      }
    }
    rec.onend = () => {
      listening.value = false
    }
    rec.onerror = (e) => {
      error.value = e.error === 'not-allowed' ? 'Izinkan akses mikrofon di browser.' : 'Rekaman suara berhenti. Coba lagi.'
      listening.value = false
    }
  })

  onBeforeUnmount(() => rec?.stop())

  function toggle() {
    if (!rec) {
      return
    }
    error.value = ''
    if (listening.value) {
      rec.stop()
    } else {
      rec.start()
      listening.value = true
    }
  }

  return { supported, listening, error, toggle }
}
