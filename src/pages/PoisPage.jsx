import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useFirebasePois } from '../hooks/useFirebasePois'
import { useDriverPosition } from '../hooks/useDriverPosition'
import { AddMarkerDialog, PoiActionsDialog, PoiMap, Toast } from '../components'
import { isMobileDevice, navigateToPoi } from '../utils/poiNavigation'
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
  }
}

export default function PoisPage({ role, pairKey }) {
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
      addToast(poi.description ? `Új pont: ${poi.description}` : 'Új pont érkezett!')
    },
    [role, addToast],
  )

  const { pois, addPoi, editPoi, deletePoi, clearAll, getNearestId } = useFirebasePois(pairKey, {
    onNewPoi: handleNewPoi,
  })

  const [gpsInterval, setGpsInterval] = useState(
    () => Number(localStorage.getItem('gpsInterval') || 2000),
  )
  const handleChangeGpsInterval = useCallback((ms) => {
    setGpsInterval(ms)
    localStorage.setItem('gpsInterval', ms)
  }, [])

  const driverLocation = useDriverPosition(pairKey, role, location, gpsInterval)

  const [editing, setEditing] = useState(null)
  const [placingApproach, setPlacingApproach] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  // GPS only runs for the driver role
  useEffect(() => {
    if (role !== 'driver') return
    startWatching()
    return () => stopWatching()
  }, [role, startWatching, stopWatching])

  const isMobile = useMemo(() => isMobileDevice(), [])

  const nearestId = useMemo(
    () => getNearestId(role === 'driver' ? location : null),
    [getNearestId, role, location],
  )

  const doneCount = useMemo(() => pois.filter((p) => p.done).length, [pois])

  const editingLabel = useMemo(() => {
    if (!editing) return ''
    let sequence = 0
    for (const poi of pois) {
      const isDone = poi.id === editing.id ? editing.done : poi.done
      if (!isDone) sequence += 1
      if (poi.id === editing.id) return isDone ? '-' : String(sequence)
    }
    return ''
  }, [pois, editing])

  function handleLongPress(lat, lon) {
    if (role === 'driver') return
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
    editPoi(editing.id, { done: !editing.done })
    setEditing(null)
  }

  function handleMarkerClick(id) {
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
        className="h-full w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
        pois={pois}
        nearestId={nearestId}
        currentLocation={role === 'driver' ? location : null}
        driverLocation={driverLocation}
        defaultZoom={DEFAULT_ZOOM}
        role={role}
        onLongPress={handleLongPress}
        onMarkerClick={handleMarkerClick}
        onMovePoi={(id, lat, lon) => editPoi(id, { lat, lon })}
        onMoveApproach={(id, lat, lon) => editPoi(id, { approach: { lat, lon } })}
        onClearAll={clearAll}
        onAddNewMarker={() => setAddOpen(true)}
        placingApproach={placingApproach}
        onCancelPlacement={() => setPlacingApproach(false)}
        doneCount={doneCount}
        totalCount={pois.length}
        gpsInterval={gpsInterval}
        onChangeGpsInterval={handleChangeGpsInterval}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />

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
        onNavigate={navigateToPoi}
        onPlaceApproach={() => setPlacingApproach(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onMarkDone={handleMarkDone}
      />
    </div>
  )
}
