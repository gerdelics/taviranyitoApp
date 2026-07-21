function toNumber(value) {
  return Number.isFinite(value) ? value : null
}

function toRad(value) {
  return (value * Math.PI) / 180
}

// Great-circle distance in kilometres between two { lat, lon } points.
export function haversineKm(pointA, pointB) {
  const lat1 = toNumber(pointA?.lat)
  const lon1 = toNumber(pointA?.lon)
  const lat2 = toNumber(pointB?.lat)
  const lon2 = toNumber(pointB?.lon)

  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return 0
  }

  const earthRadiusKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Shortest distance in kilometres from `point` to the segment `a`→`b`. Uses a
// local equirectangular projection (origin at `point`), which is accurate at the
// tens-of-metres scale we use for proximity detection. This lets us catch a
// drive-by even when no single GPS fix lands inside the radius: we test the whole
// travelled segment, not just the endpoints. Falls back to the point-to-`b`
// distance when `a` is missing (e.g. the very first fix).
export function pointToSegmentKm(point, a, b) {
  const pLat = toNumber(point?.lat)
  const pLon = toNumber(point?.lon)
  const bLat = toNumber(b?.lat)
  const bLon = toNumber(b?.lon)
  if (pLat === null || pLon === null || bLat === null || bLon === null) {
    return 0
  }
  const aLat = toNumber(a?.lat)
  const aLon = toNumber(a?.lon)
  if (aLat === null || aLon === null) {
    return haversineKm(point, b)
  }

  const earthRadiusKm = 6371
  const cosLat = Math.cos(toRad(pLat))
  // Project to local km offsets from `point` (x = east, y = north).
  const project = (lat, lon) => ({
    x: toRad(lon - pLon) * cosLat * earthRadiusKm,
    y: toRad(lat - pLat) * earthRadiusKm,
  })
  const pa = project(aLat, aLon)
  const pb = project(bLat, bLon)
  const dx = pb.x - pa.x
  const dy = pb.y - pa.y
  const lenSq = dx * dx + dy * dy
  // `point` is the origin, so project (0,0) onto the segment.
  let t = 0
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, -(pa.x * dx + pa.y * dy) / lenSq))
  }
  const cx = pa.x + t * dx
  const cy = pa.y + t * dy
  return Math.sqrt(cx * cx + cy * cy)
}
