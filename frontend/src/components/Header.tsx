import type { ChatHealth } from '../types'

interface HeaderProps {
  health: ChatHealth | null
  canClear: boolean
  onClear: () => void
}

export function Header({ health, canClear, onClear }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">Multimodal AI Chatbot</h1>
          <p className="truncate text-xs text-slate-500">
            Text &amp; images ·{' '}
            <span className="font-mono text-[11px] text-slate-600">{health?.model ?? 'checking backend…'}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {health && !health.groqConfigured && (
            <span
              className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 sm:inline"
              title="Set GROQ_API_KEY in your .env file and restart the backend."
            >
              API key missing
            </span>
          )}
          <button
            type="button"
            onClick={onClear}
            disabled={!canClear}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear chat
          </button>
        </div>
      </div>
    </header>
  )
}
