import { useEffect, useRef } from 'react'
import { EXAMPLE_PROMPTS } from '../lib/constants'
import type { ChatMessage } from '../types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: ChatMessage[]
  isSending: boolean
  onPickExample: (prompt: string) => void
}

function EmptyState({ onPickExample }: { onPickExample: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-2xl" aria-hidden="true">
        💬
      </span>
      <h2 className="text-lg font-semibold text-slate-800">Ask about anything — text or image</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Attach a screenshot, a chart or a photo with the paperclip button and ask a question about it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPickExample(prompt)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MessageList({ messages, isSending, onPickExample }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  return (
    <div className="chat-scroll flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {messages.length === 0 && !isSending ? (
          <EmptyState onPickExample={onPickExample} />
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending && <TypingIndicator />}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
