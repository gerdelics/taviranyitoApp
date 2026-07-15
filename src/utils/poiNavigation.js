// Google Maps directions helpers for POI navigation. The Maps "dir" URL
// supports waypoints, so we can route current location -> approach point -> marker.
// Omitting `origin` makes Google Maps use the device's current location.
//
// On Android we prefer the native `google.navigation:` intent instead of the web
// "dir" URL: it is the "navigation" intent, so opening it REPLACES any running
// navigation with a fresh one rather than adding the target as a stop (which is
// how Android Auto treats the web URL). iOS/desktop keep the web URL because it
// is the only scheme that supports waypoints on those platforms.

function hasCoords(point) {
  return Boolean(point) && Number.isFinite(point.lat) && Number.isFinite(point.lon)
}

// 'android' | 'ios' | null (desktop / unknown).
export function getMobilePlatform() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  return null
}

// Build a Google Maps web directions link to `destination`, optionally routing
// through `waypoints` (approach points and/or intermediate POIs) in order. The
// start point is left unset so Google Maps uses the device's current position;
// pass `origin` to set an explicit start point (e.g. the driver's position).
export function buildWebDirLink(destination, waypoints = [], origin) {
  const stops = waypoints.filter(hasCoords)
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lon}`,
    travelmode: 'driving',
  })
  if (hasCoords(origin)) {
    params.set('origin', `${origin.lat},${origin.lon}`)
  }
  if (stops.length) {
    params.set('waypoints', stops.map((p) => `${p.lat},${p.lon}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

// Backwards-compatible single-waypoint wrapper around buildWebDirLink.
export function buildGoogleMapsNavLink(destination, waypoint, origin) {
  return buildWebDirLink(destination, waypoint ? [waypoint] : [], origin)
}

// Build a native Android `google.navigation:` intent URI. `q` is the final
// destination; `waypoints` are pipe-separated intermediate stops. This intent
// starts a fresh navigation (replacing any running route) instead of adding a stop.
export function buildAndroidNavUri(destination, waypoints = []) {
  const stops = waypoints.filter(hasCoords)
  let uri = `google.navigation:q=${destination.lat},${destination.lon}&mode=d`
  if (stops.length) {
    uri += `&waypoints=${stops.map((p) => `${p.lat},${p.lon}`).join('|')}`
  }
  return uri
}

// Open turn-by-turn navigation to `destination` routing through `waypoints`.
// Android: native intent (fresh navigation). iOS: web URL (supports waypoints,
// opens the Maps app). Desktop: copy the web link to the clipboard.
// Returns 'opened' on mobile, or true/false for the clipboard result on desktop.
async function openNavigation(destination, waypoints) {
  const platform = getMobilePlatform()
  if (platform === 'android') {
    window.location.href = buildAndroidNavUri(destination, waypoints)
    return 'opened'
  }
  const link = buildWebDirLink(destination, waypoints)
  if (platform === 'ios') {
    window.location.href = link
    return 'opened'
  }
  try {
    await navigator.clipboard.writeText(link)
    return true
  } catch {
    return false
  }
}

// Open a route preview from the driver's last known position to the POI.
// Always opens in a new tab so the dispatcher stays in the app.
// Returns false if driverLocation is missing.
export function checkRouteToPoi(poi, driverLocation) {
  if (!hasCoords(driverLocation)) return false
  const link = buildGoogleMapsNavLink(poi, poi?.approach, driverLocation)
  window.open(link, '_blank', 'noopener')
  return true
}

// Google Maps' consumer directions URL only routes a limited number of stops
// per link, so long routes are split into overlapping segments.
export const MAX_STOPS_PER_LINK = 10

// Build one Google Maps directions URL for an ordered list of {lat, lon} points:
// origin = first, destination = last, the rest are waypoints in order.
export function buildRouteLink(points) {
  const origin = points[0]
  const destination = points[points.length - 1]
  const waypoints = points.slice(1, -1)
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lon}`,
    destination: `${destination.lat},${destination.lon}`,
    travelmode: 'driving',
  })
  if (waypoints.length) {
    params.set('waypoints', waypoints.map((p) => `${p.lat},${p.lon}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

// Split an ordered list of points into Google-Maps-sized route segments. Each
// segment overlaps the previous one by a single stop so the links connect
// end-to-start and together cover the whole route. Returns [] for < 2 points.
export function buildRouteLinks(points) {
  if (!Array.isArray(points) || points.length < 2) return []
  const links = []
  const step = MAX_STOPS_PER_LINK - 1
  for (let start = 0; start < points.length - 1; start += step) {
    links.push(buildRouteLink(points.slice(start, start + MAX_STOPS_PER_LINK)))
  }
  return links
}

export function isMobileDevice() {
  return getMobilePlatform() !== null
}

// Navigate to a single POI. The marker is the destination; if the POI has an
// approach point it becomes a waypoint, so the route is
// current location -> approach point -> marker.
export async function navigateToPoi(poi) {
  return openNavigation(poi, [poi?.approach])
}

// "Drive + next": navigate through the current POI and continue to the next one,
// which becomes the final destination so the driver sees where to go next as
// soon as they reach the current POI. Route:
// current location -> [current approach] -> current POI -> [next approach] -> next POI.
// Falls back to a plain drive to the current POI when there is no next POI.
export async function navigateToPoiWithNext(currentPoi, nextPoi) {
  if (!nextPoi) return navigateToPoi(currentPoi)
  return openNavigation(nextPoi, [currentPoi?.approach, currentPoi, nextPoi?.approach])
}

// Batch drive: pick as many upcoming POIs as fit in a single Google route,
// counting each approach point as an extra stop. We greedily pack POIs (in
// order) until adding the next one would exceed `maxStops` total stops, always
// keeping at least the first POI. `maxStops` defaults to the 10-stop Maps limit.
export function selectBatchPois(pois, maxStops = MAX_STOPS_PER_LINK) {
  const result = []
  let stops = 0
  for (const poi of pois) {
    const unit = 1 + (hasCoords(poi?.approach) ? 1 : 0)
    if (result.length > 0 && stops + unit > maxStops) break
    result.push(poi)
    stops += unit
    if (stops >= maxStops) break
  }
  return result
}

// Flatten POIs into ordered route stops: each POI's approach point (if any)
// followed by the POI itself.
export function poisToStops(pois) {
  const stops = []
  for (const poi of pois) {
    if (hasCoords(poi?.approach)) stops.push(poi.approach)
    stops.push(poi)
  }
  return stops.filter(hasCoords)
}

// Open one chained route through the given POIs: device location -> stop1 ->
// ... -> last stop (final destination). Returns false when there are no stops.
export async function navigateBatch(pois) {
  const stops = poisToStops(pois)
  if (stops.length === 0) return false
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1)
  return openNavigation(destination, waypoints)
}
