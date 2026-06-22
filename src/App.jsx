import { useEffect } from 'react'
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

      <main className={`w-full min-h-0 flex-1 ${isDriver ? '' : 'mx-auto max-w-6xl px-4 py-3'}`}>
        {session ? (
          <PoisPage
            role={session.role}
            pairKey={session.pairKey}
            username={session.username}
            onLogout={logout}
          />
        ) : (
          <LoginPage onLogin={login} />
        )}
      </main>
    </div>
  )
}
