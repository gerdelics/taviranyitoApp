import { useState } from 'react'
import OverlayModal from './OverlayModal'
import { useDrives, createDrive } from '../../hooks/useDrives'
import { ALL_USERNAMES } from '../../config/users'

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-GB', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Switch (or, for a controller, create) the active drive without logging out.
export default function DriveSwitcherDialog({
  open,
  onClose,
  username,
  role,
  currentDriveId,
  onSwitch,
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newDriveName, setNewDriveName] = useState('')
  const [newDriveDriver, setNewDriveDriver] = useState('')

  // Only subscribe while the dialog is open.
  const { drives, loading } = useDrives(open ? username : null)

  const isDriver = role === 'driver'
  const inputClass =
    'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none'

  const myDrives = drives.filter((d) =>
    isDriver ? d.driver === username : d.controller === username,
  )
  const otherUsers = ALL_USERNAMES.filter((u) => u !== username)

  function handleClose() {
    setShowCreate(false)
    setNewDriveName('')
    setNewDriveDriver('')
    onClose?.()
  }

  function handleCreate(e) {
    e.preventDefault()
    if (!newDriveName.trim() || !newDriveDriver) return
    const id = createDrive(newDriveName, newDriveDriver, username)
    onSwitch(id, newDriveName.trim())
    setShowCreate(false)
    setNewDriveName('')
    setNewDriveDriver('')
  }

  return (
    <OverlayModal
      open={open}
      onClose={handleClose}
      title={isDriver ? 'Switch drive' : 'Drives'}
    >
      {showCreate && !isDriver ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label htmlFor="switch-drive-name" className="mb-1 block text-xs text-slate-400">
              Drive name
            </label>
            <input
              id="switch-drive-name"
              type="text"
              value={newDriveName}
              onChange={(e) => setNewDriveName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Frankfurt city drive"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="switch-drive-driver" className="mb-1 block text-xs text-slate-400">
              Driver
            </label>
            <select
              id="switch-drive-driver"
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
            ← Back
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="py-4 text-center text-sm text-slate-500">Loading drives…</p>
          ) : myDrives.length === 0 ? (
            <p className="rounded-lg border border-slate-700 px-4 py-3 text-center text-sm text-slate-500">
              {isDriver
                ? 'No drives assigned to you yet.'
                : 'No active drives yet.'}
            </p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {myDrives.map((drive) => {
                const isCurrent = drive.id === currentDriveId
                return (
                  <button
                    key={drive.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => onSwitch(drive.id, drive.name)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      isCurrent
                        ? 'cursor-default border-cyan-600 bg-slate-800/60'
                        : 'border-slate-600 bg-slate-800 hover:border-cyan-500'
                    }`}
                  >
                    <p className="font-semibold text-slate-100">
                      {drive.name}
                      {isCurrent ? (
                        <span className="ml-2 text-xs font-normal text-cyan-400">· current</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {isDriver ? `Controller: ${drive.controller}` : `Driver: ${drive.driver}`}
                      {' · '}
                      {formatDate(drive.createdAt)}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {!isDriver ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-xl border border-dashed border-orange-700 bg-slate-800/50 py-3 text-sm font-semibold text-orange-400 hover:border-orange-500 hover:text-orange-300"
            >
              + New drive
            </button>
          ) : null}
        </div>
      )}
    </OverlayModal>
  )
}
