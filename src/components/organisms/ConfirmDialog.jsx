import OverlayModal from './OverlayModal'

// Generic confirmation modal. The confirm button colour can be toggled to red
// for destructive actions (the default) or cyan for neutral ones.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onClose,
}) {
  const confirmClass = destructive
    ? 'flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500'
    : 'flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500'

  return (
    <OverlayModal open={open} onClose={onClose} title={title} showHeaderClose={false}>
      <div className="flex flex-col gap-4">
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}

        <div className="flex gap-2 border-t border-slate-700 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:text-slate-100"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </OverlayModal>
  )
}
