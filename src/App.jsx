import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import { archiveDrive } from './hooks/useDrives'
import { DriveSwitcherDialog, PwaReloadPrompt } from './components'
import PoisPage from './pages/PoisPage'
import LoginPage from './pages/LoginPage'
import { APP_VERSION } from './version'
import { unlockAudio } from './utils/audio'
import { authReady } from './firebase'

export default function App() {
  const { session, login, logout, switchDrive } = useAuth()
  const { online, firebaseConnected } = useConnectionStatus()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  // Wait for the anonymous Firebase sign-in before rendering anything that
  // reads or writes the database (rules require auth != null).
  const [authInitialized, setAuthInitialized] = useState(false)
  const [authFailed, setAuthFailed] = useState(false)

  useEffect(() => {
    document.addEventListener('touchstart', unlockAudio, { once: true })
  }, [])

  useEffect(() => {
    authReady.then(
      () => setAuthInitialized(true),
      () => setAuthFailed(true),
    )
  }, [])

  const offlineMessage = !online
    ? 'No internet connection'
    : !firebaseConnected
      ? 'Firebase connection lost'
      : null

  const isDriver = session?.role === 'driver'

  async function handleArchive() {
    if (!window.confirm(`Archive "${session.driveName}"?\n\nThis will permanently delete all POIs for this drive.`)) return
    await archiveDrive(session.pairKey)
    logout()
  }

  function handleSwitchDrive(driveId, driveName) {
    switchDrive(driveId, driveName)
    setSwitcherOpen(false)
  }

  if (!authInitialized) {
    return (
      <div className="pt-safe flex h-dvh flex-col items-center justify-center bg-slate-950 text-slate-100">
        <PwaReloadPrompt />
        {authFailed ? (
          <div className="max-w-sm px-6 text-center">
            <p className="text-sm font-semibold text-red-300">Could not connect to Firebase</p>
            <p className="mt-2 text-xs text-slate-500">
              Anonymous sign-in failed. Check your connection and reload.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Connecting…</p>
        )}
      </div>
    )
  }

  return (
    <div className="pt-safe flex h-dvh flex-col bg-slate-950 text-slate-100">
      <PwaReloadPrompt />
      {session && !isDriver && (
        <header className="border-b border-slate-800 bg-slate-900/90">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {session.driveName || 'Remote Controller'}
              </h1>
              <p className="text-xs text-slate-600">{session.username} · 🗺️ Controller · {APP_VERSION}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  offlineMessage ? 'bg-red-500' : 'bg-green-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setSwitcherOpen(true)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
              >
                Drives
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-red-500 hover:text-red-300"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-500 hover:text-slate-200"
              >
                Log out
              </button>
            </div>
          </div>
        </header>
      )}

      {session && isDriver && (
        <header className="border-b border-slate-800 bg-slate-900/90 px-3 py-1">
          <p className="text-xs text-slate-600">Remote Controller · {APP_VERSION}</p>
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
            key={session.pairKey}
            role={session.role}
            pairKey={session.pairKey}
            username={session.username}
            onLogout={logout}
            onOpenDriveSwitcher={() => setSwitcherOpen(true)}
          />
        ) : (
          <LoginPage onLogin={login} />
        )}
      </main>

      {session && (
        <DriveSwitcherDialog
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          username={session.username}
          role={session.role}
          currentDriveId={session.pairKey}
          onSwitch={handleSwitchDrive}
        />
      )}
    </div>
  )
}
