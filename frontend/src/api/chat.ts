import type { ChatHealth } from '../types'

/**
 * All HTTP calls to the backend live here.
 * Requests are same-origin (`/api/...`) and Vite proxies them to the Express
 * server, so the Groq API key never touches the browser.
 */

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface SendChatArgs {
  sessionId: string
  message: string
  image: File | null
  signal?: AbortSignal
}

export interface ChatReply {
  reply: string
  sessionId: string
  model: string
  hadImage: boolean
}

/** Returns the API's own error message, or null when the response is not ours. */
async function readErrorMessage(response: Response): Promise<string | null> {
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return null
}

export async function sendChatMessage({ sessionId, message, image, signal }: SendChatArgs): Promise<ChatReply> {
  const form = new FormData()
  form.append('sessionId', sessionId)
  form.append('message', message)
  if (image) form.append('image', image)

  let response: Response
  try {
    response = await fetch('/api/chat', { method: 'POST', body: form, signal })
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'AbortError') throw caught
    throw new ApiError('Could not reach the server. Is the backend running on port 3001?', 0)
  }

  if (!response.ok) {
    // An unparseable error body comes from a proxy or gateway, not from our
    // API, so the useful thing to say is that the backend is not reachable.
    const serverMessage = await readErrorMessage(response)
    throw new ApiError(
      serverMessage ?? 'Could not reach the API. Is the backend running on port 3001?',
      response.status,
    )
  }

  const data = (await response.json()) as Partial<ChatReply>
  if (!data.reply) {
    throw new ApiError('The server returned an unexpected response.', response.status)
  }
  return data as ChatReply
}

/** Best-effort: a failed reset only means an orphaned entry in server memory. */
export async function resetChatSession(sessionId: string): Promise<void> {
  try {
    await fetch('/api/chat/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
  } catch {
    // Ignore.
  }
}

export async function fetchHealth(): Promise<ChatHealth | null> {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) return null
    return (await response.json()) as ChatHealth
  } catch {
    return null
  }
}
