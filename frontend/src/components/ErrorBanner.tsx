interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mx-auto mb-3 flex w-full max-w-3xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span aria-hidden="true" className="mt-0.5">
        ⚠️
      </span>
      <p className="flex-1 break-words">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="rounded-md px-1.5 text-red-500 transition hover:bg-red-100 hover:text-red-700"
      >
        ✕
      </button>
    </div>
  )
}
