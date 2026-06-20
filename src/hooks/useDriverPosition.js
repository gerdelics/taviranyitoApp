import { useEffect, useRef, useState } from 'react'
import { ref as dbRef, onValue, set } from 'firebase/database'
import { db } from '../firebase'

export function useDriverPosition(pairKey, role, location, writeIntervalMs = 2000) {
  const [driverPosition, setDriverPosition] = useState(null)
  const lastWriteRef = useRef(0)

  // Driver: push own GPS position to Firebase (rate-limited by writeIntervalMs)
  useEffect(() => {
    if (role !== 'driver' || !pairKey || !location) return
    const now = Date.now()
    if (now - lastWriteRef.current < writeIntervalMs) return
    lastWriteRef.current = now
    set(dbRef(db, `taviranyito/${pairKey}/driverPosition`), {
      lat: location.lat,
      lon: location.lon,
      accuracy: location.accuracy,
      timestamp: now,
    })
  }, [pairKey, role, location, writeIntervalMs])

  // Controller: subscribe to driver's shared position
  useEffect(() => {
    if (role !== 'controller' || !pairKey) return
    const posRef = dbRef(db, `taviranyito/${pairKey}/driverPosition`)
    const unsubscribe = onValue(posRef, (snapshot) => {
      setDriverPosition(snapshot.val())
    })
    return unsubscribe
  }, [pairKey, role])

  return role === 'controller' ? driverPosition : null
}
