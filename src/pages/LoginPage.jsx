import { useState } from 'react'
import { APP_VERSION } from '../version'
import HowToWizard from '../components/organisms/HowToWizard'

const VALID_USERS = ['gera', 'gabi']
const PASSWORD = 'qwe123'
const PARTNER = { gera: 'gabi', gabi: 'gera' }

export default function LoginPage({ onLogin }) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showWizard, setShowWizard] = useState(false)

  function handleCredentials(e) {
    e.preventDefault()
    if (!VALID_USERS.includes(username) || password !== PASSWORD) {
      setError('Hibás felhasználónév vagy jelszó.')
      return
    }
    setError('')
    setStep(2)
  }

  function handleRoleSelect(role) {
    if (role === 'controller') {
      onLogin(username, password, 'controller')
    } else {
      setStep(3)
    }
  }

  const partner = PARTNER[username] ?? ''

  return (
    <>
      {showWizard && <HowToWizard onClose={() => setShowWizard(false)} />}

      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
          <h2 className="text-center text-xl font-bold text-slate-100">Távirányító</h2>
          <p className="mb-6 text-center text-xs text-slate-600">{APP_VERSION}</p>

          {step === 1 && (
            <form onSubmit={handleCredentials} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Felhasználónév</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="gera / gabi"
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Jelszó</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                className="mt-2 rounded-lg bg-cyan-600 py-2.5 font-semibold text-white hover:bg-cyan-500"
              >
                Tovább
              </button>
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="rounded-lg border border-slate-700 py-2 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                ❓ Hogyan használd?
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-center text-sm text-slate-400">
                Válassz módot, <strong className="text-slate-200">{username}</strong>!
              </p>
              <button
                type="button"
                onClick={() => handleRoleSelect('driver')}
                className="rounded-xl border border-slate-600 bg-slate-800 py-5 text-lg font-bold text-slate-100 hover:border-cyan-500 hover:text-cyan-300"
              >
                🚗 Sofőr
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('controller')}
                className="rounded-xl border border-slate-600 bg-slate-800 py-5 text-lg font-bold text-slate-100 hover:border-orange-500 hover:text-orange-300"
              >
                🗺️ Irányító
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg py-2 text-sm text-slate-500 hover:text-slate-300"
              >
                ← Vissza
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-center text-sm text-slate-400">
                Kivel osztod meg a pozíciódat?
              </p>
              <button
                type="button"
                onClick={() => onLogin(username, password, 'driver')}
                className="rounded-xl border border-cyan-600 bg-slate-800 py-5 text-lg font-bold text-cyan-300 hover:bg-slate-700"
              >
                👤 {partner}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg py-2 text-sm text-slate-500 hover:text-slate-300"
              >
                ← Vissza
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
