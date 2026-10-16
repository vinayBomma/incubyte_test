interface ErrorMessageProps {
  error: Error
  onRetry?: () => void
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div role="alert" className="flex items-center justify-between rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      <span>{error.message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded border border-red-400 px-3 py-1 hover:bg-red-100">
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">{children}</p>
}

export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="p-6 text-center text-sm text-gray-500">
      {label}
    </p>
  )
}
