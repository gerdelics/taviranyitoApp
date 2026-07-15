import { useState } from 'react'
import BaseModal from './BaseModal'
import OverlayModal from './OverlayModal'
import { POI_TYPES, getPoiTypeIcon } from '../../utils/poiTypes'
import { haversineKm } from '../../utils/geo'
import { checkRouteToPoi } from '../../utils/poiNavigation'

export default function PoiActionsDialog({
  open,
  draft,
  number,
  role,
  isMobile = false,
  onChange,
  onNavigate,
  onNavigateNext,
  nextPoi,
  onPlaceApproach,
  onSave,
  onCancel,
  onDelete,
  onMarkDone,
  onDrop,
  currentLocation,
  driverLocation,
}) {
  const [copyState, setCopyState] = useState(null)

  if (!draft) {
    return null
  }

  const title = number === '-' ? 'Marker (done)' : `Marker #${number}`
  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none'
  const labelClass = 'text-xs uppercase tracking-wide text-slate-500'

  async function handleNavigate() {
    const result = await onNavigate(draft)
    if (result === 'opened') {
      return
    }
    setCopyState(result === true ? 'copied' : 'error')
  }

  async function handleNavigateNext() {
    const result = await onNavigateNext(draft)
    if (result === 'opened') {
      return
    }
    setCopyState(result === true ? 'copied' : 'error')
  }

  const typeLabel = POI_TYPES.find((t) => t.value === draft.type)?.label ?? draft.type
  const typeIcon = getPoiTypeIcon(draft.type)

  if (role === 'driver') {
    const isDone = draft.done
    const isDropped = draft.dropped && !isDone
    const statusText = isDone ? 'Done' : isDropped ? 'Skipped' : 'In progress'
    const statusClass = isDone
      ? 'text-emerald-400'
      : isDropped
        ? 'text-slate-400'
        : 'text-yellow-400'
    const distKm = currentLocation ? haversineKm(currentLocation, draft) : null
    const distText = distKm !== null
      ? distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`
      : null
    return (
      <BaseModal
        open={open}
        onClose={onCancel}
        closeOnBackdrop
        wrapperClassName="flex min-h-full items-end justify-center sm:items-center"
        contentClassName="w-full max-w-md rounded-t-2xl border border-slate-700 bg-slate-900 p-4 sm:rounded-2xl"
      >
        <div className="flex gap-3">
          {/* Left 2/3: info */}
          <div className="flex min-w-0 flex-[2] flex-col justify-center gap-1">
            <p className="truncate text-base font-bold text-slate-100">
              {draft.description || `${typeIcon} ${typeLabel}`.trim()}
            </p>
            <p className="text-xs text-slate-400">
              #{number}
              {draft.description ? ` · ${`${typeIcon} ${typeLabel}`.trim()}` : ''}
              {' · '}
              <span className={statusClass}>{statusText}</span>
              {distText ? (
                <span className="text-slate-500"> · {distText}</span>
              ) : null}
            </p>
            {draft.approach ? (
              <p className="text-xs text-slate-500">
                Approach: {draft.approach.lat.toFixed(4)}, {draft.approach.lon.toFixed(4)}
              </p>
            ) : null}
            {copyState === 'copied' ? <p className="text-xs text-emerald-400">Copied!</p> : null}
            {copyState === 'error' ? <p className="text-xs text-red-400">Copy failed</p> : null}
          </div>

          {/* Right 1/3: Drive + Done + Skip */}
          <div className="flex flex-[1] flex-col gap-2">
            <button
              type="button"
              onClick={handleNavigate}
              className="min-h-[3.5rem] flex-1 rounded-xl bg-cyan-600 text-sm font-bold text-white active:bg-cyan-700"
            >
              Drive
            </button>
            <button
              type="button"
              onClick={handleNavigateNext}
              disabled={!nextPoi}
              className="min-h-[3.5rem] flex-1 rounded-xl bg-cyan-700 text-sm font-bold text-white active:bg-cyan-800 disabled:opacity-40 disabled:active:bg-cyan-700"
            >
              Drive +next
            </button>
            <button
              type="button"
              onClick={onMarkDone}
              className={`min-h-[3.5rem] flex-1 rounded-xl text-sm font-bold text-white ${
                isDone ? 'bg-slate-700 active:bg-slate-600' : 'bg-emerald-600 active:bg-emerald-500'
              }`}
            >
              {isDone ? 'Undo' : 'Done'}
            </button>
            <button
              type="button"
              onClick={onDrop}
              className={`min-h-[2.75rem] rounded-xl border text-sm font-bold ${
                isDropped
                  ? 'border-slate-500 bg-slate-700 text-white active:bg-slate-600'
                  : 'border-amber-600/70 text-amber-400 active:bg-amber-600/10'
              }`}
            >
              {isDropped ? 'Restore' : 'Skip'}
            </button>
          </div>
        </div>
      </BaseModal>
    )
  }

  const navigateLabel = isMobile ? 'Open in Google Maps' : 'Copy Google Maps link'

  return (
    <OverlayModal open={open} onClose={onCancel} title={title} showHeaderClose={false}>
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
          <span className={labelClass}>Description</span>
          <input
            type="text"
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className={inputClass}
            placeholder="Add a description"
          />
        </label>

        <div className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className={labelClass}>Approach</span>
            {draft.approach ? (
              <button
                type="button"
                onClick={() => onChange({ approach: null })}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            ) : null}
          </div>

          {draft.approach ? (
            <span className="text-sm text-slate-200">
              {draft.approach.lat.toFixed(5)}, {draft.approach.lon.toFixed(5)}
            </span>
          ) : null}

          <button
            type="button"
            onClick={onPlaceApproach}
            className="self-start rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-100 hover:border-cyan-500 hover:text-cyan-300"
          >
            {draft.approach ? 'Replace approach' : 'Add approach'}
          </button>
        </div>

        {driverLocation ? (
          <button
            type="button"
            onClick={() => checkRouteToPoi(draft, driverLocation)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
          >
            Check Route
          </button>
        ) : null}

        <div>
          <button
            type="button"
            onClick={handleNavigate}
            className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500"
          >
            {navigateLabel}
          </button>
          {copyState === 'copied' ? (
            <p className="mt-1 text-center text-xs text-emerald-400">Copied!</p>
          ) : null}
          {copyState === 'error' ? (
            <p className="mt-1 text-center text-xs text-red-400">Copy failed</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onChange({ done: !draft.done })}
          className={`w-full rounded-lg px-4 py-2 text-sm font-bold text-white ${
            draft.done
              ? 'bg-slate-700 hover:bg-slate-600'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {draft.done ? 'Mark as not done' : 'Mark as done'}
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
        >
          Delete marker
        </button>

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
            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500"
          >
            Save
          </button>
        </div>
      </div>
    </OverlayModal>
  )
}
