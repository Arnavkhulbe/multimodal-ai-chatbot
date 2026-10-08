import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/chat'
import type { ChatHealth } from '../types'

/**
 * Reads the backend health endpoint once so the UI can show which model is in
 * use — and warn early when the server has no Groq key configured.
 */
export function useHealth(): ChatHealth | null {
  const [health, setHealth] = useState<ChatHealth | null>(null)

  useEffect(() => {
    let active = true
    void fetchHealth().then((result) => {
      if (active) setHealth(result)
    })
    return () => {
      active = false
    }
  }, [])

  return health
}
