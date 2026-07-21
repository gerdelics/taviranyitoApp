import { useState } from 'react'
import BaseModal from './BaseModal'
import OverlayModal from './OverlayModal'
import { POI_TYPES, getPoiTypeIcon, getPoiTypeLabel } from '../../utils/poiTypes'
import { haversineKm } from '../../utils/geo'

// Driver-side POI editor. A driver can drop a magenta-heart POI while passing an
// event mid-drive. New drafts show a type + description form (Cancel / Save);
// existing driver POIs show Drive and "Add as Next Stop" actions.
export default function DriverPoiDialog({
  open,
  draft,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onDrive,
  onAddNextStop,
  onMarkDone,
  hasActiveRoute = false,
  currentLocation,
}) {
  const [copyState, setCopyState] = useState(null)

  if (!draft) {
    return null
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-pink-500 focus:outline-none'
  const labelClass = 'text-xs uppercase tracking-wide text-slate-500'

  // New driver POI: type selector + description, with Cancel / Save.
  if (draft.isNew) {
    return (
      <OverlayModal
        open={open}
        onClose={onCancel}
        title="💗 New driver POI"
        showHeaderClose={false}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">
            {draft.lat.toFixed(5)}, {draft.lon.toFixed(5)}
          </p>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Type</span>
            <select
              value={draft.type}
              onChange={(event) => onChange({ type: event.target.value })}
              className={inputClass}
            >
              {POI_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Note</span>
            <input
              type="text"
              value={draft.description}
              onChange={(event) => onChange({ description: event.target.value })}
              className={inputClass}
              placeholder="Add a note"
            />
          </label>

          <div className="flex gap-2 border-t border-slate-700 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-1 rounded-lg bg-pink-600 px-4 py-2 text-sm font-bold text-white hover:bg-pink-500"
            >
              Save
            </button>
          </div>
        </div>
      </OverlayModal>
    )
  }

  // Existing driver POI: Drive + Add as Next Stop.
  const typeLabel = getPoiTypeLabel(draft.type)
  const typeIcon = getPoiTypeIcon(draft.type)
  const distKm = currentLocation ? haversineKm(currentLocation, draft) : null
  const distText =
    distKm !== null
      ? distKm < 1
        ? `${Math.round(distKm * 1000)} m`
        : `${distKm.toFixed(1)} km`
      : null

  async function handleDrive() {
    const result = await onDrive(draft)
    if (result === 'opened') return
    setCopyState(result === true ? 'copied' : 'error')
  }

  async function handleAddNext() {
    const result = await onAddNextStop(draft)
    if (result === 'opened') return
    setCopyState(result === true ? 'copied' : 'error')
  }

  return (
    <BaseModal
      open={open}
      onClose={onCancel}
      closeOnBackdrop
      wrapperClassName="flex min-h-full items-end justify-center sm:items-center"
      contentClassName="w-full max-w-md rounded-t-2xl border border-pink-500/40 bg-slate-900 p-4 sm:rounded-2xl"
    >
      <div className="flex gap-3">
        {/* Left: info */}
        <div className="flex min-w-0 flex-[2] flex-col justify-center gap-1">
          <p className="truncate text-base font-bold text-slate-100">
            <span className="text-pink-400">💗</span>{' '}
            {draft.description || `${typeIcon} ${typeLabel}`.trim()}
          </p>
          <p className="text-xs text-slate-400">
            Driver POI
            {' · '}
            {`${typeIcon} ${typeLabel}`.trim()}
            {distText ? <span className="text-slate-500"> · {distText}</span> : null}
          </p>
          {copyState === 'copied' ? (
            <p className="text-xs text-emerald-400">Copied!</p>
          ) : null}
          {copyState === 'error' ? (
            <p className="text-xs text-red-400">Copy failed</p>
          ) : null}
        </div>

        {/* Right: Drive + Add as Next Stop + Delete */}
        <div className="flex flex-[1] flex-col gap-2">
          <button
            type="button"
            onClick={handleDrive}
            className="min-h-[3.5rem] flex-1 rounded-xl bg-cyan-600 text-sm font-bold text-white active:bg-cyan-700"
          >
            Drive
          </button>
          <button
            type="button"
            onClick={handleAddNext}
            disabled={!hasActiveRoute}
            className="min-h-[3.5rem] flex-1 rounded-xl bg-pink-600 text-sm font-bold text-white active:bg-pink-700 disabled:opacity-40 disabled:active:bg-pink-600"
          >
            Add as Next Stop
          </button>
          <button
            type="button"
            onClick={onMarkDone}
            className={`min-h-[3.5rem] flex-1 rounded-xl text-sm font-bold text-white ${
              draft.done ? 'bg-slate-700 active:bg-slate-600' : 'bg-emerald-600 active:bg-emerald-500'
            }`}
          >
            {draft.done ? 'Undo' : 'Done'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-[2.75rem] rounded-xl border border-red-600/70 text-sm font-bold text-red-400 active:bg-red-600/10"
          >
            Delete
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
