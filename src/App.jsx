import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import PoisPage from './pages/PoisPage'
import LoginPage from './pages/LoginPage'
import { APP_VERSION } from './version'
import { unlockAudio } from './utils/audio'

export default function App() {
  const { session, login, logout } = useAuth()
  const { online, firebaseConnected } = useConnectionStatus()

  // Unlock AudioContext on first touch (required by iOS Safari)
  useEffect(() => {
    document.addEventListener('touchstart', unlockAudio, { once: true })
  }, [])

  const offlineMessage = !online
    ? 'Nincs internetkapcsolat'
    : !firebaseConnected
      ? 'Firebase kapcsolat megszakadt'
      : null

  const isDriver = session?.role === 'driver'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      {session && !isDriver && (
        <header className="border-b border-slate-800 bg-slate-900/90">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-lg font-semibold leading-tight">Távirányító · POIs</h1>
              <p className="text-xs text-slate-600">{APP_VERSION}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    offlineMessage ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                {session.username} · 🗺️ Irányító
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-red-500 hover:text-red-300"
              >
                Kilépés
              </button>
            </div>
          </div>
        </header>
      )}

      {offlineMessage && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 bg-red-900/80 px-4 py-2 text-sm font-semibold text-red-200"
        >
          <span>⚠️</span>
          <span>{offlineMessage}</span>
        </div>
      )}

      <main className={`relative w-full min-h-0 flex-1 ${isDriver ? '' : 'mx-auto max-w-6xl px-4 py-3'}`}>
        {session ? (
          <PoisPage role={session.role} pairKey={session.pairKey} />
        ) : (
          <LoginPage onLogin={login} />
        )}

        {isDriver && session && (
          <>
            {menuOpen && (
              <div
                className="absolute inset-0 z-[1999]"
                onClick={() => setMenuOpen(false)}
              />
            )}
            <div className="absolute left-3 top-3 z-[2000]">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-lg text-slate-300 shadow hover:text-slate-100"
                aria-label="Menü"
              >
                ☰
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full mt-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
                  <p className="text-sm font-semibold text-slate-200">{session.username}</p>
                  <p className="mb-3 text-xs text-slate-500">🚗 Sofőr</p>
                  <button
                    type="button"
                    onClick={() => { logout(); setMenuOpen(false) }}
                    className="w-full rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-red-500 hover:text-red-300"
                  >
                    Kilépés
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
