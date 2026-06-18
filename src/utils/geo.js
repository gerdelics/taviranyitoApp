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
