import type { ChatMessage } from '../types'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          AI
        </span>
      )}

      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[80%]',
          isUser
            ? 'bg-indigo-600 text-white'
            : 'border border-slate-200 bg-white text-slate-800',
        ].join(' ')}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Attached by the user"
            className="mb-2 max-h-64 w-auto max-w-full rounded-xl border border-black/10 object-contain"
          />
        )}
        {message.text ? (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        ) : (
          /* Image-only turn: the backend still asks the model to describe it. */
          !message.imageUrl && <p className="italic opacity-70">(no text)</p>
        )}
      </div>

      {isUser && <span className="sr-only">You</span>}
    </div>
  )
}
