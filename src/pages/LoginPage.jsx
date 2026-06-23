import { useState } from 'react'
import { APP_VERSION } from '../version'
import HowToWizard from '../components/organisms/HowToWizard'
import { USERS, ALL_USERNAMES } from '../config/users'
import { useDrives, createDrive } from '../hooks/useDrives'

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-GB', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function LoginPage({ onLogin }) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)

  // Controller: create drive form
  const [showCreate, setShowCreate] = useState(false)
  const [newDriveName, setNewDriveName] = useState('')
  const [newDriveDriver, setNewDriveDriver] = useState('')

  const { drives, loading } = useDrives(step >= 3 ? username : null)

  const inputClass =
    'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none'

  function handleCredentials(e) {
    e.preventDefault()
    if (!USERS[username] || USERS[username] !== password) {
      setError('Invalid username or password.')
      return
    }
    setError('')
    setStep(2)
  }

  function handleRoleSelect(role) {
    setSelectedRole(role)
    setShowCreate(false)
    setNewDriveName('')
    setNewDriveDriver('')
    setStep(3)
  }

  const myDrives = drives.filter((d) =>
    selectedRole === 'driver' ? d.driver === username : d.controller === username,
  )

  function handleJoinDrive(drive) {
    onLogin(username, password, selectedRole, drive.id, drive.name)
  }

  function handleCreateDrive(e) {
    e.preventDefault()
    if (!newDriveName.trim() || !newDriveDriver) return
    const driveId = createDrive(newDriveName, newDriveDriver, username)
    onLogin(username, password, 'controller', driveId, newDriveName.trim())
  }

  const otherUsers = ALL_USERNAMES.filter((u) => u !== username)

  return (
    <>
      {showWizard && <HowToWizard onClose={() => setShowWizard(false)} />}

      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
          <h2 className="text-center text-xl font-bold text-slate-100">Remote Controller</h2>
          <p className="mb-6 text-center text-xs text-slate-600">{APP_VERSION}</p>

          {/* Step 1 — credentials */}
          {step === 1 && (
            <form onSubmit={handleCredentials} className="flex flex-col gap-4">
              <div>
                <label htmlFor="login-username" className="mb-1 block text-sm text-slate-400">
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  className={inputClass}
                  placeholder="gera / lacko / ..."
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm text-slate-400">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                className="mt-2 rounded-lg bg-cyan-600 py-2.5 font-semibold text-white hover:bg-cyan-500"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="rounded-lg border border-slate-700 py-2 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                ❓ How to use?
              </button>
            </form>
          )}

          {/* Step 2 — role */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-center text-sm text-slate-400">
                Choose your role, <strong className="text-slate-200">{username}</strong>!
              </p>
              <button
                type="button"
                onClick={() => handleRoleSelect('driver')}
                className="rounded-xl border border-slate-600 bg-slate-800 py-5 text-lg font-bold text-slate-100 hover:border-cyan-500 hover:text-cyan-300"
              >
                🚗 Driver
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('controller')}
                className="rounded-xl border border-slate-600 bg-slate-800 py-5 text-lg font-bold text-slate-100 hover:border-orange-500 hover:text-orange-300"
              >
                🗺️ Controller
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg py-2 text-sm text-slate-500 hover:text-slate-300"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 3 — driver: pick a drive */}
          {step === 3 && selectedRole === 'driver' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-300">Select your drive</p>
              {loading ? (
                <p className="py-4 text-center text-sm text-slate-500">Loading drives…</p>
              ) : myDrives.length === 0 ? (
                <p className="rounded-lg border border-slate-700 px-4 py-3 text-center text-sm text-slate-500">
                  No drives assigned to you yet.
                  <br />
                  Ask your controller to create one.
                </p>
              ) : (
                <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {myDrives.map((drive) => (
                    <button
                      key={drive.id}
                      type="button"
                      onClick={() => handleJoinDrive(drive)}
                      className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-left hover:border-cyan-500"
                    >
                      <p className="font-semibold text-slate-100">{drive.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Controller: {drive.controller} · {formatDate(drive.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg py-2 text-sm text-slate-500 hover:text-slate-300"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 3 — controller: pick or create a drive */}
          {step === 3 && selectedRole === 'controller' && (
            <div className="flex flex-col gap-3">
              {!showCreate ? (
                <>
                  <p className="text-sm font-semibold text-slate-300">Your drives</p>
                  {!loading && myDrives.length > 0 && (
                    <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                      {myDrives.map((drive) => (
                        <button
                          key={drive.id}
                          type="button"
                          onClick={() => handleJoinDrive(drive)}
                          className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-left hover:border-orange-500"
                        >
                          <p className="font-semibold text-slate-100">{drive.name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Driver: {drive.driver} · {formatDate(drive.createdAt)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {!loading && myDrives.length === 0 && (
                    <p className="text-center text-sm text-slate-500">No active drives yet.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="rounded-xl border border-dashed border-orange-700 bg-slate-800/50 py-3 text-sm font-semibold text-orange-400 hover:border-orange-500 hover:text-orange-300"
                  >
                    + New drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-lg py-2 text-sm text-slate-500 hover:text-slate-300"
                  >
                    ← Back
                  </button>
                </>
              ) : (
                <form onSubmit={handleCreateDrive} className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-slate-300">Create new drive</p>
                  <div>
                    <label htmlFor="drive-name" className="mb-1 block text-xs text-slate-400">
                      Drive name
                    </label>
                    <input
                      id="drive-name"
                      type="text"
                      value={newDriveName}
                      onChange={(e) => setNewDriveName(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Frankfurt city drive"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="drive-driver" className="mb-1 block text-xs text-slate-400">
                      Driver
                    </label>
                    <select
                      id="drive-driver"
                      value={newDriveDriver}
                      onChange={(e) => setNewDriveDriver(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select driver…</option>
                      {otherUsers.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!newDriveName.trim() || !newDriveDriver}
                    className="rounded-lg bg-orange-600 py-2.5 font-semibold text-white hover:bg-orange-500 disabled:opacity-40"
                  >
                    Start drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-lg py-2 text-sm text-slate-500 hover:text-slate-300"
                  >
                    ← Cancel
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
