import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useRelativeTime } from '../../hooks/useRelativeTime'
import { getPoiTypeIcon, getPoiTypeLabel } from '../../utils/poiTypes'
import { buildRouteLinks } from '../../utils/poiNavigation'

const DEFAULT_CENTER = [47.4979, 19.0402]
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors'

const COLOR_DONE = '#22c55e'
const COLOR_NEAREST = '#0ea5e9'
const COLOR_DEFAULT = '#ef4444'
const COLOR_DROPPED = '#64748b'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10

function poiColor(poi, nearestId, batchDriveIdSet) {
  if (poi.done) {
    return COLOR_DONE
  }
  if (poi.dropped) {
    return COLOR_DROPPED
  }
  if (poi.id === nearestId) {
    return COLOR_NEAREST
  }
  // POIs from the last launched batch route stay blue until done.
  if (batchDriveIdSet?.has(poi.id)) {
    return COLOR_NEAREST
  }
  return COLOR_DEFAULT
}

function buildMarkerIcon(label, color, selected = false) {
  const shadow = selected
    ? 'box-shadow:0 0 0 3px #f59e0b,0 1px 3px rgba(0,0,0,.5)'
    : 'box-shadow:0 1px 3px rgba(0,0,0,.5)'
  const html = `<div style="width:28px;height:28px;border-radius:9999px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;${shadow}">${label}</div>`
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
}

const APPROACH_COLOR = '#94a3b8'

function toRad(deg) {
  return (deg * Math.PI) / 180
}

// Initial bearing (degrees, 0 = north, clockwise) from `from` to `to`. Used to
// rotate the direction arrow so it points along the connector toward the marker.
function computeBearing(from, to) {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLon = toRad(to.lon - from.lon)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

function buildArrowIcon(bearing) {
  const html = `<div style="transform:rotate(${bearing}deg);color:${APPROACH_COLOR};font-size:18px;line-height:1;text-shadow:0 0 2px rgba(0,0,0,.6)">▲</div>`
  return L.divIcon({ html, className: '', iconSize: [18, 18], iconAnchor: [9, 9] })
}

// Less prominent dot for the approach point.
function buildApproachIcon() {
  const html = `<div style="width:14px;height:14px;border-radius:9999px;background:#64748b;border:1px solid ${APPROACH_COLOR};opacity:.85"></div>`
  return L.divIcon({ html, className: '', iconSize: [14, 14], iconAnchor: [7, 7] })
}

// Long-press a marker (~0.5s) to lift it, then drag and release to reposition.
// A short tap is left untouched so the marker's click handler still fires.
// `onCommit(lat, lon)` runs on release; `clickGuard.dragged` is set so the
// trailing click can be ignored.
function attachLongPressDrag(map, marker, onCommit, clickGuard) {
  const el = marker.getElement()
  if (!el) {
    return
  }

  let timer = null
  let dragging = false
  let startX = 0
  let startY = 0

  const handleMove = (event) => {
    if (!dragging) {
      if (
        timer &&
        (Math.abs(event.clientX - startX) > MOVE_CANCEL_PX ||
          Math.abs(event.clientY - startY) > MOVE_CANCEL_PX)
      ) {
        clearTimeout(timer)
        timer = null
      }
      return
    }
    event.preventDefault()
    marker.setLatLng(map.mouseEventToLatLng(event))
  }

  const handleUp = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    document.removeEventListener('pointermove', handleMove)
    document.removeEventListener('pointerup', handleUp)
    document.removeEventListener('pointercancel', handleUp)
    if (dragging) {
      dragging = false
      map.dragging.enable()
      el.style.cursor = ''
      if (clickGuard) {
        clickGuard.dragged = true
      }
      const { lat, lng } = marker.getLatLng()
      onCommit(lat, lng)
    }
  }

  const handleDown = (event) => {
    startX = event.clientX
    startY = event.clientY
    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    document.addEventListener('pointercancel', handleUp)
    timer = setTimeout(() => {
      timer = null
      dragging = true
      map.dragging.disable()
      el.style.cursor = 'grabbing'
    }, LONG_PRESS_MS)
  }

  el.addEventListener('pointerdown', handleDown)
}

// Draw the approach point for a POI: a dim draggable marker, a
// dashed connector, and an arrow at the midpoint pointing toward the POI.
function addApproachLayers(layer, map, poi, onMoveApproach) {
  const approach = poi.approach
  if (
    !approach ||
    !Number.isFinite(approach.lat) ||
    !Number.isFinite(approach.lon)
  ) {
    return
  }

  L.polyline(
    [
      [approach.lat, approach.lon],
      [poi.lat, poi.lon],
    ],
    { color: APPROACH_COLOR, weight: 2, opacity: 0.7, dashArray: '4 5' },
  ).addTo(layer)

  const midLat = (approach.lat + poi.lat) / 2
  const midLon = (approach.lon + poi.lon) / 2
  L.marker([midLat, midLon], {
    icon: buildArrowIcon(computeBearing(approach, poi)),
    interactive: false,
    keyboard: false,
  }).addTo(layer)

  const approachMarker = L.marker([approach.lat, approach.lon], {
    icon: buildApproachIcon(),
  }).addTo(layer)
  attachLongPressDrag(map, approachMarker, (lat, lon) => onMoveApproach(poi.id, lat, lon))
}

const GPS_INTERVALS = [
  { ms: 1000, label: '1s' },
  { ms: 3000, label: '3s' },
  { ms: 5000, label: '5s' },
]

function accuracyColor(accuracy) {
  if (accuracy < 15) return 'text-green-400'
  if (accuracy < 50) return 'text-yellow-400'
  return 'text-red-400'
}

export default function PoiMap({
  className,
  pois = [],
  nearestId = null,
  batchDriveIds = [],
  currentLocation,
  driverLocation,
  defaultZoom = 14,
  role,
  onLongPress,
  onMarkerClick,
  onMarkActiveDone,
  bubblePois = [],
  driveMode = 'single',
  onToggleDriveMode,
  batchCount = 0,
  onBatchDrive,
  autoDoneEnabled = true,
  onToggleAutoDone,
  autoDonePoi = null,
  autoDoneSeconds = null,
  onCancelAutoDone,
  onMovePoi,
  onMoveApproach,
  onClearAll,
  onAddNewMarker,
  onOpenReorder,
  placingApproach = false,
  onCancelPlacement,
  routeSelectMode = false,
  selectedRouteIds = [],
  onToggleRouteMode,
  onOpenRoute,
  doneCount = 0,
  droppedCount = 0,
  totalCount = 0,
  gpsInterval = 2000,
  onChangeGpsInterval,
  username,
  onLogout,
  onOpenDriveSwitcher,
}) {
  const { text: lastSeenText, isStale } = useRelativeTime(driverLocation?.timestamp)
  const [menuOpen, setMenuOpen] = useState(false)
  // Screen-space positions of the POIs that get an info bubble, so each bubble
  // tracks its marker as the map pans/zooms. Empty when there are no targets.
  const [bubblePoints, setBubblePoints] = useState([])

  // Route-check mode: the selected POIs in POI order, and the Google Maps
  // route link(s) they produce (split into overlapping segments when long).
  const selectedRoutePois = routeSelectMode
    ? pois.filter((p) => selectedRouteIds.includes(p.id))
    : []
  const routeLinks = buildRouteLinks(
    selectedRoutePois.map((p) => ({ lat: p.lat, lon: p.lon })),
  )

  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const currentMarkerRef = useRef(null)
  const centeredRef = useRef(false)
  const driverMarkerRef = useRef(null)
  const driverCenteredRef = useRef(false)

  // Keep latest callbacks/data reachable from the long-press handlers without
  // re-binding native listeners on every render.
  const onLongPressRef = useRef(onLongPress)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onMovePoiRef = useRef(onMovePoi)
  const onMoveApproachRef = useRef(onMoveApproach)
  useEffect(() => {
    onLongPressRef.current = onLongPress
    onMarkerClickRef.current = onMarkerClick
    onMovePoiRef.current = onMovePoi
    onMoveApproachRef.current = onMoveApproach
  })

  // Map initialization.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined
    }

    const container = containerRef.current
    if (container._leaflet_id) {
      delete container._leaflet_id
    }

    const map = L.map(container, { zoomControl: true }).setView(DEFAULT_CENTER, defaultZoom)
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map)
    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const invalidate = () => map.invalidateSize({ pan: false })
    const raf = requestAnimationFrame(invalidate)
    const timeoutA = setTimeout(invalidate, 80)
    const timeoutB = setTimeout(invalidate, 250)

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null
    resizeObserver?.observe(container)
    window.addEventListener('resize', invalidate)

    // Long-press to drop a marker: works for a held left-press on desktop and a
    // long-tap on touch. A move beyond the threshold (i.e. a map drag) or an
    // early release cancels it.
    let pressTimer = null
    let startX = 0
    let startY = 0
    let pressCoords = null

    const clearPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
      pressCoords = null
    }

    const onPointerDown = (event) => {
      // Ignore presses that begin on an existing marker.
      if (event.target?.closest?.('.leaflet-marker-icon')) {
        return
      }
      startX = event.clientX
      startY = event.clientY
      pressCoords = { clientX: event.clientX, clientY: event.clientY }
      clearTimeout(pressTimer)
      pressTimer = setTimeout(() => {
        pressTimer = null
        if (!pressCoords) {
          return
        }
        const latlng = map.mouseEventToLatLng(pressCoords)
        onLongPressRef.current?.(latlng.lat, latlng.lng)
      }, LONG_PRESS_MS)
    }

    const onPointerMove = (event) => {
      if (!pressTimer) {
        return
      }
      if (
        Math.abs(event.clientX - startX) > MOVE_CANCEL_PX ||
        Math.abs(event.clientY - startY) > MOVE_CANCEL_PX
      ) {
        clearPress()
      }
    }

    const suppressContextMenu = (event) => event.preventDefault()

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', clearPress)
    container.addEventListener('pointercancel', clearPress)
    container.addEventListener('pointerleave', clearPress)
    container.addEventListener('contextmenu', suppressContextMenu)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeoutA)
      clearTimeout(timeoutB)
      clearPress()
      window.removeEventListener('resize', invalidate)
      resizeObserver?.disconnect()
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', clearPress)
      container.removeEventListener('pointercancel', clearPress)
      container.removeEventListener('pointerleave', clearPress)
      container.removeEventListener('contextmenu', suppressContextMenu)

      const mountedMap = mapRef.current
      mapRef.current = null
      markersLayerRef.current = null
      currentMarkerRef.current = null
      centeredRef.current = false
      driverMarkerRef.current = null
      driverCenteredRef.current = false
      if (mountedMap) {
        mountedMap.remove()
      }
    }
  }, [defaultZoom])

  // Render POI markers whenever the list or nearest target changes.
  useEffect(() => {
    const layer = markersLayerRef.current
    if (!layer) {
      return
    }

    const map = mapRef.current
    layer.clearLayers()
    const batchDriveIdSet = new Set(batchDriveIds)
    // Only not-done markers are numbered (1, 2, 3…); done markers show "-" and
    // are skipped, so the sequence closes up when one is marked done.
    let sequence = 0
    pois.forEach((poi) => {
      // Approach layers first so the numbered marker sits on top of them.
      addApproachLayers(layer, map, poi, (id, lat, lon) =>
        onMoveApproachRef.current?.(id, lat, lon),
      )

      let label = '-'
      if (!poi.done && !poi.dropped) {
        sequence += 1
        label = String(sequence)
      } else if (poi.dropped && !poi.done) {
        label = '×'
      }

      const marker = L.marker([poi.lat, poi.lon], {
        icon: buildMarkerIcon(
          label,
          poiColor(poi, nearestId, batchDriveIdSet),
          routeSelectMode && selectedRouteIds.includes(poi.id),
        ),
      }).addTo(layer)

      const clickGuard = { dragged: false }
      marker.on('click', () => {
        if (clickGuard.dragged) {
          clickGuard.dragged = false
          return
        }
        onMarkerClickRef.current?.(poi.id)
      })
      attachLongPressDrag(
        map,
        marker,
        (lat, lon) => onMovePoiRef.current?.(poi.id, lat, lon),
        clickGuard,
      )
    })
  }, [pois, nearestId, batchDriveIds, routeSelectMode, selectedRouteIds])

  // Keep each info bubble anchored to its marker: recompute the markers' screen
  // positions on every map move/zoom so the bubbles follow them.
  useEffect(() => {
    const map = mapRef.current
    if (!map || bubblePois.length === 0) {
      setBubblePoints([])
      return undefined
    }
    const update = () =>
      setBubblePoints(
        bubblePois.map((p) => {
          const pt = map.latLngToContainerPoint([p.lat, p.lon])
          return { id: p.id, x: pt.x, y: pt.y }
        }),
      )
    update()
    map.on('move zoom resize', update)
    return () => {
      map.off('move zoom resize', update)
    }
  }, [bubblePois])

  // Current GPS position marker, plus a one-time recenter on first fix.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const hasFix =
      typeof currentLocation?.lat === 'number' && typeof currentLocation?.lon === 'number'

    if (!hasFix) {
      if (currentMarkerRef.current) {
        map.removeLayer(currentMarkerRef.current)
        currentMarkerRef.current = null
      }
      return
    }

    const latLng = [currentLocation.lat, currentLocation.lon]
    if (!currentMarkerRef.current) {
      currentMarkerRef.current = L.circleMarker(latLng, {
        radius: 6,
        color: '#0ea5e9',
        fillColor: '#0ea5e9',
        fillOpacity: 0.95,
      }).addTo(map)
    } else {
      currentMarkerRef.current.setLatLng(latLng)
    }

    if (!centeredRef.current) {
      map.setView(latLng, map.getZoom(), { animate: false })
      centeredRef.current = true
    }
  }, [currentLocation])

  // Driver's shared position marker (visible to the controller as an orange dot)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const hasFix =
      typeof driverLocation?.lat === 'number' && typeof driverLocation?.lon === 'number'

    if (!hasFix) {
      if (driverMarkerRef.current) {
        map.removeLayer(driverMarkerRef.current)
        driverMarkerRef.current = null
      }
      return
    }

    const latLng = [driverLocation.lat, driverLocation.lon]
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.circleMarker(latLng, {
        radius: 9,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.95,
      }).addTo(map)
      if (!driverCenteredRef.current) {
        map.setView(latLng, map.getZoom(), { animate: false })
        driverCenteredRef.current = true
      }
    } else {
      driverMarkerRef.current.setLatLng(latLng)
    }
  }, [driverLocation])

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Controller: action buttons top-right */}
      {role !== 'driver' && !placingApproach && !routeSelectMode ? (
        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
          {pois.filter((p) => !p.done).length > 1 ? (
            <button
              type="button"
              onClick={onOpenReorder}
              className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm font-bold text-slate-100 shadow hover:border-cyan-500 hover:text-cyan-300"
            >
              ⇅ Reorder
            </button>
          ) : null}
          {pois.length > 1 ? (
            <button
              type="button"
              onClick={onToggleRouteMode}
              className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm font-bold text-slate-100 shadow hover:border-cyan-500 hover:text-cyan-300"
            >
              🧭 Check route
            </button>
          ) : null}
          {pois.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm font-bold text-slate-100 shadow hover:border-red-500 hover:text-red-300"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAddNewMarker}
            className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm font-bold text-slate-100 shadow hover:border-cyan-500 hover:text-cyan-300"
          >
            Add new marker
          </button>
        </div>
      ) : null}

      {/* Controller: last seen + driver accuracy — top-left */}
      {role !== 'driver' && lastSeenText ? (
        <div className="pointer-events-none absolute left-3 top-20 z-[1000] flex flex-col gap-1">
          <div
            className={`rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold shadow ${isStale ? 'text-red-400' : 'text-orange-300'}`}
          >
            🚗 {lastSeenText}
          </div>
          {typeof driverLocation?.accuracy === 'number' ? (
            <div
              className={`rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold shadow ${accuracyColor(driverLocation.accuracy)}`}
            >
              ±{Math.round(driverLocation.accuracy)} m
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Driver: GPS interval selector + hamburger menu — top-right */}
      {role === 'driver' ? (
        <>
          {menuOpen && (
            <div
              className="absolute inset-0 z-[999]"
              onClick={() => setMenuOpen(false)}
            />
          )}
          <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-1.5">
            <div className="flex items-stretch gap-1.5">
            <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 shadow">
              {GPS_INTERVALS.map(({ ms, label }) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => onChangeGpsInterval?.(ms)}
                  className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    gpsInterval === ms
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
                className="flex h-full min-w-[2.25rem] items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 px-2 text-sm text-slate-300 shadow hover:text-slate-100"
              >
                ☰
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
                  <p className="text-sm font-semibold text-slate-200">{username}</p>
                  <p className="mb-3 text-xs text-slate-500">🚗 Driver</p>
                  {onOpenDriveSwitcher ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onOpenDriveSwitcher()
                      }}
                      className="mb-2 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                    >
                      Switch drive
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-red-500 hover:text-red-300"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
            </div>
            {nearestId ? (
              <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 shadow">
                {[
                  { value: 'single', label: 'Single' },
                  { value: 'batch', label: 'Batch' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onToggleDriveMode?.(value)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      driveMode === value
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            {nearestId ? (
              <button
                type="button"
                onClick={() => onToggleAutoDone?.(!autoDoneEnabled)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow transition-colors ${
                  autoDoneEnabled
                    ? 'border-emerald-600 bg-emerald-600/90 text-white'
                    : 'border-slate-700 bg-slate-900/90 text-slate-400 hover:text-slate-100'
                }`}
              >
                Auto-Done {autoDoneEnabled ? 'On' : 'Off'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Driver: bottom-center action — Next POI (single) or Batch Drive (batch) */}
      {role === 'driver' && nearestId ? (
        <div className="absolute bottom-14 left-1/2 z-[1000] -translate-x-1/2">
          {driveMode === 'batch' ? (
            <button
              type="button"
              onClick={onBatchDrive}
              disabled={batchCount === 0}
              className="rounded-full bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg active:bg-indigo-700 disabled:opacity-40"
            >
              Batch Drive{batchCount > 0 ? ` (${batchCount})` : ''}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const nearest = pois.find((p) => p.id === nearestId)
                if (nearest && mapRef.current) {
                  mapRef.current.setView(
                    [nearest.lat, nearest.lon],
                    mapRef.current.getZoom(),
                    { animate: true },
                  )
                }
                onMarkerClickRef.current?.(nearestId)
              }}
              className="rounded-full bg-cyan-600 px-8 py-4 text-base font-bold text-white shadow-lg active:bg-cyan-700"
            >
              Next POI
            </button>
          )}
        </div>
      ) : null}

      {/* Driver: always-visible info bubble(s) anchored to the focused POI(s) */}
      {role === 'driver'
        ? bubblePoints.map((pt) => {
            const poi = bubblePois.find((p) => p.id === pt.id)
            if (!poi) return null
            return (
              <div
                key={pt.id}
                className="absolute z-[900] w-max max-w-[16rem]"
                style={{
                  left: pt.x,
                  top: pt.y,
                  transform: 'translate(-50%, calc(-100% - 22px))',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setView(
                        [poi.lat, poi.lon],
                        mapRef.current.getZoom(),
                        { animate: true },
                      )
                    }
                    onMarkerClickRef.current?.(poi.id)
                  }}
                  className="relative cursor-pointer rounded-2xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-xl"
                >
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
                    <span>{getPoiTypeIcon(poi.type)}</span>
                    <span className="truncate">{getPoiTypeLabel(poi.type)}</span>
                  </p>
                  {poi.description ? (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-300">
                      {poi.description}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMarkActiveDone?.(poi.id)
                    }}
                    className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white active:bg-emerald-500"
                  >
                    Done
                  </button>
                  {/* tail pointing down at the marker */}
                  <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-700 bg-slate-900/95" />
                </div>
              </div>
            )
          })
        : null}

      {/* Driver: proximity auto-done countdown — top-center */}
      {role === 'driver' && autoDonePoi ? (
        <div className="absolute left-1/2 top-3 z-[1001] flex -translate-x-1/2 items-center gap-3 rounded-full bg-emerald-600/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
          <span>
            Auto-Done in {autoDoneSeconds}s
            {autoDonePoi.description ? `: ${autoDonePoi.description}` : ''}
          </span>
          <button
            type="button"
            onClick={onCancelAutoDone}
            className="rounded-full bg-white/20 px-3 py-0.5 hover:bg-white/30"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {/* Driver: GPS accuracy — bottom-right */}
      {role === 'driver' && typeof currentLocation?.accuracy === 'number' ? (
        <div
          className={`pointer-events-none absolute bottom-3 right-3 z-[1000] rounded-full bg-slate-900/90 px-4 py-1.5 text-sm font-semibold shadow ${accuracyColor(currentLocation.accuracy)}`}
        >
          GPS: ±{Math.round(currentLocation.accuracy)} m
        </div>
      ) : null}

      {/* Both roles: done/total count — bottom-left */}
      {totalCount > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-full bg-slate-900/90 px-4 py-1.5 text-sm font-semibold text-slate-300 shadow">
          {doneCount + droppedCount} / {totalCount} done
        </div>
      ) : null}

      {/* Controller: placing approach hint — top-center */}
      {role !== 'driver' && placingApproach ? (
        <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-cyan-600/90 px-4 py-1.5 text-xs font-bold text-white shadow">
          <span>Long-press the map to place the approach point</span>
          <button
            type="button"
            onClick={onCancelPlacement}
            className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {/* Controller: route-check mode — top hint + bottom action bar */}
      {role !== 'driver' && routeSelectMode ? (
        <>
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-amber-600/90 px-4 py-1.5 text-xs font-bold text-white shadow">
            Tap POIs to select them for the route · {selectedRoutePois.length} selected
          </div>
          <div className="absolute bottom-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2">
            <button
              type="button"
              disabled={routeLinks.length === 0}
              onClick={() => onOpenRoute?.(routeLinks)}
              className="rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg active:bg-cyan-700 disabled:opacity-40"
            >
              Open route ({selectedRoutePois.length} stops
              {routeLinks.length > 1 ? ` · ${routeLinks.length} links` : ''})
            </button>
            <button
              type="button"
              onClick={onToggleRouteMode}
              className="rounded-full border border-slate-600 bg-slate-900/90 px-4 py-2.5 text-sm font-bold text-slate-200 shadow hover:text-slate-100"
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {/* Controller: long-press hint — bottom-center */}
      {role !== 'driver' && !placingApproach && !routeSelectMode ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
          Long-press the map to drop a marker · long-press a marker to move it
        </div>
      ) : null}
    </div>
  )
}
