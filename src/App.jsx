import { useAuth } from './hooks/useAuth'
import PoisPage from './pages/PoisPage'
import LoginPage from './pages/LoginPage'
import { APP_VERSION } from './version'

export default function App() {
  const { session, login, logout } = useAuth()

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Távirányító · POIs</h1>
            <p className="text-xs text-slate-600">{APP_VERSION}</p>
          </div>
          {session && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">
                {session.username} · {session.role === 'driver' ? '🚗 Sofőr' : '🗺️ Irányító'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-red-500 hover:text-red-300"
              >
                Kilépés
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl min-h-0 flex-1 px-4 py-3">
        {session ? (
          <PoisPage role={session.role} pairKey={session.pairKey} />
        ) : (
          <LoginPage onLogin={login} />
        )}
      </main>
    </div>
  )
}
