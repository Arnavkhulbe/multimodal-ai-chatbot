import { useCallback, useRef, useState } from 'react'
import { resetChatSession, sendChatMessage } from '../api/chat'
import { createSessionId, readStoredSessionId, storeSessionId } from '../lib/session'
import type { ChatMessage } from '../types'

export interface UseChatResult {
  messages: ChatMessage[]
  isSending: boolean
  error: string | null
  send: (text: string, image: File | null) => Promise<void>
  clear: () => void
  dismissError: () => void
}

/**
 * Owns the conversation state for one browser session.
 *
 * The backend keeps the authoritative history (so it is available for the next
 * Groq call); the component state below is the visual transcript, including
 * local object URLs for the images the user attached.
 */
export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionIdRef = useRef<string>(readStoredSessionId())
  const inFlightRef = useRef<AbortController | null>(null)
  const objectUrlsRef = useRef<string[]>([])

  const send = useCallback(async (text: string, image: File | null) => {
    const trimmed = text.trim()
    if (!trimmed && !image) return

    setError(null)

    let imageUrl: string | undefined
    if (image) {
      imageUrl = URL.createObjectURL(image)
      objectUrlsRef.current.push(imageUrl)
    }

    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: 'user', text: trimmed, imageUrl },
    ])
    setIsSending(true)

    const controller = new AbortController()
    inFlightRef.current = controller

    try {
      const { reply } = await sendChatMessage({
        sessionId: sessionIdRef.current,
        message: trimmed,
        image,
        signal: controller.signal,
      })
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: 'assistant', text: reply },
      ])
    } catch (caught) {
      // An abort means the user cleared the chat, so there is nothing to report.
      if (controller.signal.aborted) return
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      if (inFlightRef.current === controller) inFlightRef.current = null
      setIsSending(false)
    }
  }, [])

  const clear = useCallback(() => {
    inFlightRef.current?.abort()
    inFlightRef.current = null

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []

    setMessages([])
    setError(null)
    setIsSending(false)

    // Forget the old conversation server-side and start a brand new one.
    void resetChatSession(sessionIdRef.current)
    const freshSessionId = createSessionId()
    sessionIdRef.current = freshSessionId
    storeSessionId(freshSessionId)
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  return { messages, isSending, error, send, clear, dismissError }
}
