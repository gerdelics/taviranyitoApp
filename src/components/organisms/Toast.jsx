export default function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[2000] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-cyan-700/95 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          <span>📌 {t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-1 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
