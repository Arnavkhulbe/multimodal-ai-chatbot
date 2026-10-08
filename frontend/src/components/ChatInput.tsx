import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type KeyboardEvent, type RefObject } from 'react'
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from '../lib/constants'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (text: string, image: File | null) => void
  isSending: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

/** Validates a candidate image in the browser so the user gets instant feedback. */
function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please attach a PNG, JPEG or WebP image.'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `That image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_IMAGE_SIZE_MB} MB.`
  }
  return null
}

export function ChatInput({ value, onChange, onSend, isSending, textareaRef }: ChatInputProps) {
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Grow the textarea with its content, up to a few lines.
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [value, textareaRef])

  // Release the preview URL when it is replaced or the composer unmounts.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function attachImage(file: File | undefined | null) {
    if (!file) return
    const problem = validateImage(file)
    if (problem) {
      setAttachmentError(problem)
      return
    }
    setAttachmentError(null)
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function removeImage() {
    setImage(null)
    setPreviewUrl(null)
    setAttachmentError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    attachImage(event.target.files?.[0])
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'))
    if (pasted) {
      event.preventDefault()
      attachImage(pasted)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    attachImage(event.dataTransfer.files?.[0])
  }

  function submit() {
    if (isSending || (!value.trim() && !image)) return
    onSend(value, image)
    onChange('')
    removeImage()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a newline. Ignore IME composition.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const canSend = !isSending && (value.trim().length > 0 || image !== null)

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        {(attachmentError || (image && !attachmentError)) && (
          <div className="mb-2 flex items-center gap-3">
            {image && previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Attachment preview"
                  className="size-16 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove attached image"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white transition hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            )}
            {image && (
              <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                {image.name} · {(image.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        )}

        {attachmentError && <p className="mb-2 text-xs text-red-600">{attachmentError}</p>}

        <div
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            'flex items-end gap-2 rounded-2xl border bg-white px-2 py-2 shadow-sm transition',
            isDragging ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            title="Attach an image (PNG, JPEG, WebP)"
            aria-label="Attach an image"
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 01-7.78-7.78l8.49-8.49a3.5 3.5 0 014.95 4.95l-8.49 8.49a1.5 1.5 0 01-2.12-2.12l7.78-7.78"
              />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={image ? 'Ask a question about this image…' : 'Type your message…'}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            aria-label="Send message"
          >
            {isSending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6-6m6 6l-6 6" />
              </svg>
            )}
          </button>
        </div>

        <p className="mt-2 px-1 text-center text-[11px] text-slate-400">
          Enter to send · Shift+Enter for a new line · PNG/JPEG/WebP up to {MAX_IMAGE_SIZE_MB} MB
        </p>
      </div>
    </div>
  )
}
