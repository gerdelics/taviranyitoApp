import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useFirebasePois } from '../hooks/useFirebasePois'
import { useDriverPosition } from '../hooks/useDriverPosition'
import { useWakeLock } from '../hooks/useWakeLock'
import { AddMarkerDialog, ConfirmDialog, DriverPoiDialog, PoiActionsDialog, PoiMap, PoiReorderDialog, Toast } from '../components'
import { isMobileDevice, navigateToPoi, navigateToPoiWithNext, navigateBatch, selectBatchPois } from '../utils/poiNavigation'
import { useProximityAutoDone } from '../hooks/useProximityAutoDone'
import { playBeep, playHaptic } from '../utils/audio'

const DEFAULT_ZOOM = 14
// In batch mode only the next couple of POIs get an info bubble, to keep the
// map light and the focus on what's immediately ahead.
const BATCH_BUBBLE_COUNT = 2

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
    driverPoi: poi.driverPoi ?? false,
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
  // POI ids from the most recently launched batch drive, highlighted blue so the
  // driver sees how many of that route are still left.
  const [lastBatchIds, setLastBatchIds] = useState([])
  // Driver bottom action: 'single' shows the Next POI button, 'batch' shows the
  // Batch Drive button (a chained route through the next several POIs).
  const [driveMode, setDriveMode] = useState(
    () => (localStorage.getItem('driveMode') === 'batch' ? 'batch' : 'single'),
  )
  const handleToggleDriveMode = useCallback((mode) => {
    setDriveMode(mode)
    localStorage.setItem('driveMode', mode)
  }, [])
  // Whether proximity auto-done (30 m → 10 s countdown) is active.
  const [autoDoneEnabled, setAutoDoneEnabled] = useState(
    () => localStorage.getItem('autoDone') !== 'off',
  )
  const handleToggleAutoDone = useCallback((enabled) => {
    setAutoDoneEnabled(enabled)
    localStorage.setItem('autoDone', enabled ? 'on' : 'off')
  }, [])

  // Keep screen awake while driving so GPS keeps broadcasting
  useWakeLock(role === 'driver')

  // GPS only runs for the driver role
  useEffect(() => {
    if (role !== 'driver') return
    startWatching()
    return () => stopWatching()
  }, [role, startWatching, stopWatching])

  const isMobile = useMemo(() => isMobileDevice(), [])

  // Pending = still an active route target (neither done nor skipped). Driver
  // POIs are ad-hoc and never drive the automatic nearest/route logic.
  const nearestId = useMemo(() => {
    if (role !== 'driver') return null
    const isPending = (p) => !p.done && !p.dropped && !p.driverPoi
    if (activeTargetId && pois.some((p) => p.id === activeTargetId && isPending(p))) {
      return activeTargetId
    }
    return pois.find(isPending)?.id ?? null
  }, [pois, role, activeTargetId])

  const activePoi = useMemo(
    () => (nearestId ? pois.find((p) => p.id === nearestId) ?? null : null),
    [pois, nearestId],
  )

  // Upcoming pending POIs (route order) and the batch that fits one Google route.
  const pendingPois = useMemo(
    () => pois.filter((p) => !p.done && !p.dropped && !p.driverPoi),
    [pois],
  )
  const batchPois = useMemo(
    () => (role === 'driver' && driveMode === 'batch' ? selectBatchPois(pendingPois) : []),
    [role, driveMode, pendingPois],
  )

  // Blue-highlighted ids: only in batch mode, only the last launched route.
  const batchDriveIds = useMemo(
    () => (driveMode === 'batch' ? lastBatchIds : []),
    [driveMode, lastBatchIds],
  )

  // POIs that get an info bubble + proximity auto-done: the next two upcoming
  // POIs in batch mode, otherwise just the single active POI. As each is done
  // the list shifts forward on its own.
  const focusPois = useMemo(() => {
    if (role !== 'driver') return []
    if (driveMode === 'batch') return batchPois.slice(0, BATCH_BUBBLE_COUNT)
    return activePoi ? [activePoi] : []
  }, [role, driveMode, batchPois, activePoi])

  const handleAutoDone = useCallback(
    (id) => editPoi(id, { done: true, dropped: false }),
    [editPoi],
  )
  // Auto-done watches every unfinished POI the driver could pass — the whole
  // pending route plus driver POIs — not just the on-screen bubbles. This way a
  // drive-by anywhere triggers it, regardless of route order or drive mode.
  const autoDoneWatchPois = useMemo(
    () => (role === 'driver' ? pois.filter((p) => !p.done && !p.dropped) : []),
    [role, pois],
  )
  const { countdownPoi, countdown, cancel: cancelAutoDone } = useProximityAutoDone(
    role === 'driver' ? location : null,
    autoDoneWatchPois,
    handleAutoDone,
    autoDoneEnabled,
  )

  // Route POIs (excludes ad-hoc driver POIs) back the done/total badge.
  const routePois = useMemo(() => pois.filter((p) => !p.driverPoi), [pois])
  const doneCount = useMemo(() => routePois.filter((p) => p.done).length, [routePois])
  const droppedCount = useMemo(
    () => routePois.filter((p) => p.dropped && !p.done).length,
    [routePois],
  )

  const editingLabel = useMemo(() => {
    if (!editing) return ''
    if (editing.driverPoi) return '♥'
    let sequence = 0
    for (const poi of pois) {
      if (poi.driverPoi) continue
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
    if (routeSelectMode) return
    // Driver long-press drops a magenta-heart driver POI at that spot, then
    // opens the type/note form. Same gesture the controller uses.
    if (role === 'driver') {
      const poi = addPoi(lat, lon, { driverPoi: true })
      if (poi) setEditing(draftFromPoi(poi, true))
      return
    }
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
    const pending = pois.filter((p) => !p.done && !p.dropped && !p.driverPoi)
    const idx = pending.findIndex((p) => p.id === poi.id)
    return idx >= 0 ? (pending[idx + 1] ?? null) : null
  }

  // Driver pressed "Drive +next": route through this POI and continue to the
  // next pending one so they see where to go next on arrival.
  function handleDriveWithNext(poi) {
    setActiveTargetId(poi.id)
    return navigateToPoiWithNext(poi, getNextPendingPoi(poi))
  }

  // Driver saved a new/edited driver POI: persist just the type and note. Driver
  // POIs stay unpublished so they don't trigger the driver's own new-POI toast.
  function handleDriverPoiSave() {
    if (!editing) return
    editPoi(editing.id, { type: editing.type, description: editing.description })
    setEditing(null)
  }

  // Driver pressed "Add as Next Stop" on a driver POI: insert it into the live
  // navigation right after the current target (current → active POI → driver POI).
  // With no active target it behaves like a plain Drive.
  function handleAddAsNextStop(poi) {
    if (activePoi) {
      return navigateToPoiWithNext(activePoi, poi)
    }
    return navigateToPoi(poi)
  }

  // Driver pressed "Batch Drive": open one chained route through the batch POIs.
  async function handleBatchDrive() {
    if (batchPois.length === 0) return
    setActiveTargetId(batchPois[0].id)
    setLastBatchIds(batchPois.map((p) => p.id))
    const result = await navigateBatch(batchPois)
    if (result === true) addToast('Route link copied')
    else if (result === false) addToast('Could not open route')
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
        batchDriveIds={batchDriveIds}
        currentLocation={role === 'driver' ? location : null}
        driverLocation={driverLocation}
        defaultZoom={DEFAULT_ZOOM}
        role={role}
        onLongPress={handleLongPress}
        onMarkerClick={handleMarkerClick}
        onMarkActiveDone={handleMarkActiveDone}
        bubblePois={focusPois}
        driveMode={driveMode}
        onToggleDriveMode={handleToggleDriveMode}
        batchCount={batchPois.length}
        onBatchDrive={handleBatchDrive}
        autoDoneEnabled={autoDoneEnabled}
        onToggleAutoDone={handleToggleAutoDone}
        autoDonePoi={countdownPoi}
        autoDoneSeconds={countdown?.secondsLeft ?? null}
        onCancelAutoDone={cancelAutoDone}
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
        totalCount={routePois.length}
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

      {role === 'driver' && editing?.driverPoi ? (
        <DriverPoiDialog
          key={`driver-${editing.id}`}
          open={Boolean(editing)}
          draft={editing}
          onChange={handleDraftChange}
          onSave={handleDriverPoiSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onDrive={handleDrive}
          onAddNextStop={handleAddAsNextStop}
          onMarkDone={handleMarkDone}
          hasActiveRoute={Boolean(activePoi)}
          currentLocation={location}
        />
      ) : null}

      <PoiActionsDialog
        key={editing?.id ?? 'none'}
        open={Boolean(editing) && !placingApproach && !(role === 'driver' && editing?.driverPoi)}
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
