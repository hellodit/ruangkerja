/**
 * Schemas are shared by server and client. Error messages are i18n keys; the
 * client passes its `t` so users see translated text, while the server keeps
 * the raw keys (only validity matters there).
 */
export type Translate = (key: string, params?: Record<string, unknown>) => string

export const identity: Translate = key => key
