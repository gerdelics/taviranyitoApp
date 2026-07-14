// Google Maps directions helpers for POI navigation. The Maps "dir" URL
// supports a waypoint, so we can route current location -> approach point -> marker.
// Omitting `origin` makes Google Maps use the device's current location.

function hasCoords(point) {
  return Boolean(point) && Number.isFinite(point.lat) && Number.isFinite(point.lon)
}

// Build a Google Maps directions link to `destination`, optionally routing
// through `waypoint` (the approach point) first. The start point is
// left unset so Google Maps always uses the device's current position; the
// waypoint is the second stop and the destination is the final target.
// Pass `origin` to set an explicit start point (e.g. the driver's position).
export function buildGoogleMapsNavLink(destination, waypoint, origin) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lon}`,
    travelmode: 'driving',
  })
  if (hasCoords(origin)) {
    params.set('origin', `${origin.lat},${origin.lon}`)
  }
  if (hasCoords(waypoint)) {
    params.set('waypoints', `${waypoint.lat},${waypoint.lon}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
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
  if (typeof navigator === 'undefined') {
    return false
  }
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// On mobile we hand the link to the OS so Google Maps opens and starts
// navigating. On desktop we copy the link to the clipboard instead. Returns
// 'opened' on mobile, true/false for the clipboard result on desktop.
//
// The marker is the destination; if the POI has an approach point it becomes a
// waypoint, so the route is current location -> approach point -> marker.
export async function navigateToPoi(poi) {
  const link = buildGoogleMapsNavLink(poi, poi?.approach)

  if (isMobileDevice()) {
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
