import { useRef, useState } from 'react'
import { ChatInput } from './components/ChatInput'
import { ErrorBanner } from './components/ErrorBanner'
import { Header } from './components/Header'
import { MessageList } from './components/MessageList'
import { useChat } from './hooks/useChat'
import { useHealth } from './hooks/useHealth'

export default function App() {
  const { messages, isSending, error, send, clear, dismissError } = useChat()
  const health = useHealth()

  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePickExample = (prompt: string) => {
    setDraft(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <Header health={health} canClear={messages.length > 0 || isSending} onClear={clear} />

      <main className="flex min-h-0 flex-1 flex-col">
        <MessageList messages={messages} isSending={isSending} onPickExample={handlePickExample} />

        <div className="px-4">
          {error && <ErrorBanner message={error} onDismiss={dismissError} />}
        </div>

        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={(text, image) => void send(text, image)}
          isSending={isSending}
          textareaRef={textareaRef}
        />
      </main>
    </div>
  )
}
