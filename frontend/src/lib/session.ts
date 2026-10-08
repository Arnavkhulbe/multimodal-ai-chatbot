const STORAGE_KEY = 'multimodal-chatbot.session-id'

/**
 * The session id links this browser tab to the conversation the backend keeps
 * in memory. It is not a security token: it only names a chat history.
 */
export function createSessionId(): string {
  return crypto.randomUUID()
}

export function readStoredSessionId(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch {
    // Private mode / disabled storage: fall back to an in-memory id.
  }
  const fresh = createSessionId()
  storeSessionId(fresh)
  return fresh
}

export function storeSessionId(sessionId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, sessionId)
  } catch {
    // Ignore: the chat still works for this page load.
  }
}
