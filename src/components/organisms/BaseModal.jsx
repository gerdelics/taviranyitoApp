import { useEffect } from 'react'

export default function BaseModal({
  open,
  onClose,
  children,
  variant = 'center',
  closeOnBackdrop = true,
  backdropClassName,
  wrapperClassName,
  contentClassName,
  zIndexClassName = 'z-[2000]',
}) {
  // On mobile, focusing an input inside a fixed bottom-sheet makes the browser
  // scroll the page up to clear the keyboard; some browsers don't restore it on
  // close, leaving an empty bar at the bottom. Snap the scroll back when the
  // modal closes as a cross-platform safety net.
  useEffect(() => {
    if (!open) return undefined
    return () => window.scrollTo(0, 0)
  }, [open])

  if (!open) {
    return null
  }

  const isFullscreen = variant === 'fullscreen'
  const backdropClasses = backdropClassName || (isFullscreen ? 'bg-slate-950' : 'bg-black/60')
  const wrapperClasses =
    wrapperClassName ||
    (isFullscreen ? 'flex h-full w-full flex-col' : 'flex min-h-full items-end justify-center sm:items-center')

  function handleBackdropClick() {
    if (closeOnBackdrop) {
      onClose?.()
    }
  }

  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} ${backdropClasses}`.trim()}
      onClick={handleBackdropClick}
    >
      <div className={wrapperClasses}>
        <div
          className={contentClassName || ''}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
