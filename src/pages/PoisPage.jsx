import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useFirebasePois } from '../hooks/useFirebasePois'
import { useDriverPosition } from '../hooks/useDriverPosition'
import { useWakeLock } from '../hooks/useWakeLock'
import { AddMarkerDialog, ConfirmDialog, PoiActionsDialog, PoiMap, PoiReorderDialog, Toast } from '../components'
import { isMobileDevice, navigateToPoi, navigateToPoiWithNext } from '../utils/poiNavigation'
import { playBeep, playHaptic } from '../utils/audio'

const DEFAULT_ZOOM = 14

function draftFromPoi(poi, isNew) {
  return {
    id: poi.id,
    isNew,
    lat: poi.lat,
    lon: poi.lon,
    type: poi.type,
    description: poi.description,
    approach: poi.approach ?? null,
    done: poi.done,
    dropped: poi.dropped ?? false,
  }
}

export default function PoisPage({ role, pairKey, username, onLogout, onOpenDriveSwitcher }) {
  const { location, startWatching, stopWatching } = useGeolocation()

  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleNewPoi = useCallback(
    (poi) => {
      if (role !== 'driver') return
      playBeep()
      playHaptic()
      addToast(poi.description ? `New POI: ${poi.description}` : 'New POI received!')
    },
    [role, addToast],
  )

  const { pois, addPoi, editPoi, deletePoi, clearAll, reorderPois } = useFirebasePois(pairKey, {
    onNewPoi: handleNewPoi,
  })

  const [gpsInterval, setGpsInterval] = useState(
    () => Number(localStorage.getItem('gpsInterval') || 3000),
  )
  const handleChangeGpsInterval = useCallback((ms) => {
    setGpsInterval(ms)
    localStorage.setItem('gpsInterval', ms)
  }, [])

  const driverLocation = useDriverPosition(pairKey, role, location, gpsInterval)

  const [editing, setEditing] = useState(null)
  const [placingApproach, setPlacingApproach] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  // The POI the driver last chose to drive to. Overrides the automatic "first
  // pending" target so the highlight follows an out-of-order Drive tap. State
  // resets naturally on a drive switch because App keys this page by pairKey.
  const [activeTargetId, setActiveTargetId] = useState(null)
  // Controller route-check mode: tap POIs on the map to select a subset, then
  // open their Google Maps route (POI order: first = origin, last = destination).
  const [routeSelectMode, setRouteSelectMode] = useState(false)
  const [selectedRouteIds, setSelectedRouteIds] = useState([])

  // Keep screen awake while driving so GPS keeps broadcasting
  useWakeLock(role === 'driver')

  // GPS only runs for the driver role
  useEffect(() => {
    if (role !== 'driver') return
    startWatching()
    return () => stopWatching()
  }, [role, startWatching, stopWatching])

  const isMobile = useMemo(() => isMobileDevice(), [])

  // Pending = still an active target (neither done nor skipped).
  const nearestId = useMemo(() => {
    if (role !== 'driver') return null
    const isPending = (p) => !p.done && !p.dropped
    if (activeTargetId && pois.some((p) => p.id === activeTargetId && isPending(p))) {
      return activeTargetId
    }
    return pois.find(isPending)?.id ?? null
  }, [pois, role, activeTargetId])

  const doneCount = useMemo(() => pois.filter((p) => p.done).length, [pois])
  const droppedCount = useMemo(
    () => pois.filter((p) => p.dropped && !p.done).length,
    [pois],
  )

  const editingLabel = useMemo(() => {
    if (!editing) return ''
    let sequence = 0
    for (const poi of pois) {
      const isDone = poi.id === editing.id ? editing.done : poi.done
      const isDropped = poi.id === editing.id ? editing.dropped : poi.dropped
      const resolved = isDone || isDropped
      if (!resolved) sequence += 1
      if (poi.id === editing.id) {
        if (!resolved) return String(sequence)
        return isDropped && !isDone ? '×' : '-'
      }
    }
    return ''
  }, [pois, editing])

  function handleToggleRouteMode() {
    setRouteSelectMode((v) => !v)
    setSelectedRouteIds([])
    setEditing(null)
  }

  function handleToggleRouteSelect(id) {
    setSelectedRouteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleOpenRoute(links) {
    links.forEach((link) => window.open(link, '_blank', 'noopener'))
    setRouteSelectMode(false)
    setSelectedRouteIds([])
  }

  function handleLongPress(lat, lon) {
    if (role === 'driver' || routeSelectMode) return
    if (placingApproach && editing) {
      setEditing((prev) => ({ ...prev, approach: { lat, lon } }))
      setPlacingApproach(false)
      return
    }
    const poi = addPoi(lat, lon)
    if (poi) {
      setEditing(draftFromPoi(poi, true))
    }
  }

  function handleMarkDone() {
    if (!editing) return
    const done = !editing.done
    // Done and skipped are mutually exclusive statuses.
    editPoi(editing.id, done ? { done: true, dropped: false } : { done: false })
    setEditing(null)
  }

  function handleDrop() {
    if (!editing) return
    const dropped = !editing.dropped
    editPoi(editing.id, dropped ? { dropped: true, done: false } : { dropped: false })
    setEditing(null)
  }

  // Driver pressed "Drive": make this POI the active target and open Maps.
  function handleDrive(poi) {
    setActiveTargetId(poi.id)
    return navigateToPoi(poi)
  }

  // Next pending POI after `poi` in route order (pending = not done, not dropped).
  function getNextPendingPoi(poi) {
    const pending = pois.filter((p) => !p.done && !p.dropped)
    const idx = pending.findIndex((p) => p.id === poi.id)
    return idx >= 0 ? (pending[idx + 1] ?? null) : null
  }

  // Driver pressed "Drive +next": route through this POI and continue to the
  // next pending one so they see where to go next on arrival.
  function handleDriveWithNext(poi) {
    setActiveTargetId(poi.id)
    return navigateToPoiWithNext(poi, getNextPendingPoi(poi))
  }

  // Mark the active-POI bubble's POI done directly from the map. Once it's
  // done the nearestId memo advances to the next pending POI on its own.
  function handleMarkActiveDone(id) {
    editPoi(id, { done: true, dropped: false })
  }

  function handleMarkerClick(id) {
    if (routeSelectMode) {
      handleToggleRouteSelect(id)
      return
    }
    const poi = pois.find((item) => item.id === id)
    if (poi) {
      setEditing(draftFromPoi(poi, false))
    }
  }

  function handleDraftChange(patch) {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function handleSave() {
    if (!editing) return
    editPoi(editing.id, {
      type: editing.type,
      description: editing.description,
      approach: editing.approach,
      done: editing.done,
      ...(editing.isNew ? { published: true } : {}),
    })
    setEditing(null)
    setPlacingApproach(false)
  }

  function handleCancel() {
    if (editing?.isNew) {
      deletePoi(editing.id)
    }
    setEditing(null)
    setPlacingApproach(false)
  }

  function handleDelete() {
    if (editing) deletePoi(editing.id)
    setEditing(null)
    setPlacingApproach(false)
  }

  return (
    <div className="h-full">
      <PoiMap
        className={`h-full w-full overflow-hidden bg-slate-900 ${role === 'driver' ? '' : 'rounded-xl border border-slate-700'}`}
        username={username}
        onLogout={onLogout}
        pois={pois}
        nearestId={nearestId}
        currentLocation={role === 'driver' ? location : null}
        driverLocation={driverLocation}
        defaultZoom={DEFAULT_ZOOM}
        role={role}
        onLongPress={handleLongPress}
        onMarkerClick={handleMarkerClick}
        onMarkActiveDone={handleMarkActiveDone}
        onMovePoi={(id, lat, lon) => editPoi(id, { lat, lon })}
        onMoveApproach={(id, lat, lon) => editPoi(id, { approach: { lat, lon } })}
        onClearAll={() => setClearConfirmOpen(true)}
        onAddNewMarker={() => setAddOpen(true)}
        onOpenReorder={() => setReorderOpen(true)}
        placingApproach={placingApproach}
        onCancelPlacement={() => setPlacingApproach(false)}
        routeSelectMode={routeSelectMode}
        selectedRouteIds={selectedRouteIds}
        onToggleRouteMode={handleToggleRouteMode}
        onOpenRoute={handleOpenRoute}
        doneCount={doneCount}
        droppedCount={droppedCount}
        totalCount={pois.length}
        gpsInterval={gpsInterval}
        onChangeGpsInterval={handleChangeGpsInterval}
        onOpenDriveSwitcher={onOpenDriveSwitcher}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <PoiReorderDialog
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        pois={pois}
        onReorder={reorderPois}
        driverLocation={driverLocation}
      />

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear all POIs"
        message="Are you sure you want to delete all POIs? This cannot be undone."
        confirmLabel="Clear all"
        onConfirm={() => {
          clearAll()
          setClearConfirmOpen(false)
        }}
        onClose={() => setClearConfirmOpen(false)}
      />

      <AddMarkerDialog
        key={addOpen ? 'add-open' : 'add-closed'}
        open={addOpen}
        defaultCoords={
          role === 'driver' && location
            ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`
            : ''
        }
        onAdd={addPoi}
        onClose={() => setAddOpen(false)}
      />

      <PoiActionsDialog
        key={editing?.id ?? 'none'}
        open={Boolean(editing) && !placingApproach}
        draft={editing}
        number={editingLabel}
        role={role}
        isMobile={isMobile}
        onChange={handleDraftChange}
        onNavigate={role === 'driver' ? handleDrive : navigateToPoi}
        onNavigateNext={role === 'driver' ? handleDriveWithNext : undefined}
        nextPoi={role === 'driver' && editing ? getNextPendingPoi(editing) : null}
        onPlaceApproach={() => setPlacingApproach(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onMarkDone={handleMarkDone}
        onDrop={handleDrop}
        currentLocation={role === 'driver' ? location : null}
        driverLocation={role !== 'driver' ? driverLocation : null}
      />
    </div>
  )
}
