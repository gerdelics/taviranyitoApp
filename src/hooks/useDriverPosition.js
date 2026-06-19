import { useEffect, useRef, useState } from 'react'
import { ref as dbRef, onValue, set } from 'firebase/database'
import { db } from '../firebase'

const WRITE_INTERVAL_MS = 2000

export function useDriverPosition(pairKey, role, location) {
  const [driverPosition, setDriverPosition] = useState(null)
  const lastWriteRef = useRef(0)

  // Driver: push own GPS position to Firebase (max once per 2s)
  useEffect(() => {
    if (role !== 'driver' || !pairKey || !location) return
    const now = Date.now()
    if (now - lastWriteRef.current < WRITE_INTERVAL_MS) return
    lastWriteRef.current = now
    set(dbRef(db, `taviranyito/${pairKey}/driverPosition`), {
      lat: location.lat,
      lon: location.lon,
      accuracy: location.accuracy,
      timestamp: now,
    })
  }, [pairKey, role, location])

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
