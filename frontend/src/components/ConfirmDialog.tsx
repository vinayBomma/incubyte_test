import { type ReactNode, useState } from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  children: ReactNode
}

export function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel, children }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function handleConfirm() {
    setPending(true)
    setError(undefined)
    try {
      await onConfirm()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong')
      setPending(false)
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-4 text-sm">
        {error && (
          <p role="alert" className="rounded border border-red-300 bg-red-50 p-2 text-red-800">
            {error}
          </p>
        )}
        <div>{children}</div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
