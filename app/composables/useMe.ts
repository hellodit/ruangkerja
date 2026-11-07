export interface MeData {
  user: { id: string, name: string, email: string, image: string | null, timezone: string }
  positionTitle: string | null
  today: string
  onboardingCompleted: boolean
  isAdmin: boolean
  subscription: { name: string, endsAt: string, daysLeft: number } | null
  hasSkp: boolean
  rhkCount: number
  evidenceCount: number
  currentPeriod: { id: string, label: string, startDate: string, endDate: string, submissionDeadline: string } | null
}

/** Shell data (sidebar, onboarding gate). Shared state, refreshed after writes. */
export function useMe() {
  const me = useState<MeData | null>('me', () => null)
  const requestFetch = useRequestFetch()

  async function refresh() {
    try {
      me.value = await requestFetch<MeData>('/api/me')
    } catch {
      me.value = null
    }
    return me.value
  }

  async function ensure() {
    return me.value ?? refresh()
  }

  return { me, refresh, ensure }
}
