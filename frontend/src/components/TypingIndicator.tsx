/** Shown while the assistant is thinking (the request is in flight). */
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
        AI
      </span>
      <div
        className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">The assistant is thinking…</span>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
