import type { SingapayEventType } from './singapay'

/**
 * Business handling for verified SingaPay events. Intentionally a logged
 * no-op for now: the app has no order/payment model yet. Throwing here makes
 * the webhook return 500 so SingaPay retries the delivery.
 */
export async function handleSingapayEvent(type: SingapayEventType | null, payload: Record<string, unknown>) {
  console.info('[singapay] event received', {
    type: type ?? 'unknown',
    event: typeof payload.event === 'string' ? payload.event : undefined
  })
}
