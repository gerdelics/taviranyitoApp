import { useRegisterSW } from 'virtual:pwa-register/react'

// How often to poll the server for a freshly deployed service worker while the
// app stays open.
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

// Shows an "update available" banner when a newer deployed version is detected.
// Checks happen on launch, on an interval, and whenever the (installed) app is
// brought back to the foreground — the common way a PWA is "reopened".
export default function PwaReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const checkForUpdate = () => {
        if (registration.installing) return
        if ('onLine' in navigator && !navigator.onLine) return
        registration.update().catch(() => {})
      }

      // Cold open: verify we're on the latest version right away.
      checkForUpdate()

      setInterval(checkForUpdate, CHECK_INTERVAL_MS)

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div className="pt-safe fixed inset-x-0 top-0 z-[2500] flex justify-center px-3">
      <div className="mt-2 flex w-full max-w-md items-center gap-3 rounded-xl border border-cyan-700 bg-slate-900/95 px-4 py-3 shadow-xl">
        <span className="text-lg" aria-hidden>🔄</span>
        <p className="flex-1 text-sm text-slate-200">A new version is available.</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Update
        </button>
      </div>
    </div>
  )
}
