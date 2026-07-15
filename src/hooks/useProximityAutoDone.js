import { useEffect, useRef, useState } from 'react'
import { haversineKm } from '../utils/geo'

// When the driver comes within 30 m of a watched POI we start a 10-second
// countdown before marking it done automatically. The driver can cancel it,
// which suppresses that POI so the countdown does not immediately restart while
// still nearby. Only one countdown runs at a time (POIs are passed one by one).
const THRESHOLD_KM = 0.03 // 30 m
const COUNTDOWN_SECONDS = 10

export function useProximityAutoDone(location, pois, onAutoDone, enabled = true) {
  const [countdown, setCountdown] = useState(null) // { id, secondsLeft }
  const suppressedRef = useRef(new Set())
  const onAutoDoneRef = useRef(onAutoDone)
  useEffect(() => {
    onAutoDoneRef.current = onAutoDone
  })

  // Start a countdown when the driver enters 30 m of an eligible POI and none is
  // already running. When disabled, clear any running countdown.
  useEffect(() => {
    setCountdown((current) => {
      if (!enabled) return null
      if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) {
        return current
      }
      if (current) return current
      const near = pois.find(
        (p) =>
          !p.done &&
          !p.dropped &&
          !suppressedRef.current.has(p.id) &&
          haversineKm(location, p) <= THRESHOLD_KM,
      )
      return near ? { id: near.id, secondsLeft: COUNTDOWN_SECONDS } : null
    })
  }, [location, pois, enabled])

  // Tick the active countdown once per second (inside the timeout callback, so
  // the state update is not a synchronous cascade). When it reaches zero we mark
  // the POI done and clear the countdown.
  useEffect(() => {
    if (!countdown) return undefined
    const timer = setTimeout(() => {
      setCountdown((c) => {
        if (!c) return null
        const next = c.secondsLeft - 1
        if (next <= 0) {
          onAutoDoneRef.current?.(c.id)
          return null
        }
        return { ...c, secondsLeft: next }
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const cancel = () => {
    setCountdown((c) => {
      if (c) suppressedRef.current.add(c.id)
      return null
    })
  }

  // Only surface a POI that is still eligible; if it was completed elsewhere the
  // banner hides and the harmless background tick just clears itself.
  const countdownPoi = countdown
    ? pois.find((p) => p.id === countdown.id && !p.done && !p.dropped) ?? null
    : null

  return { countdown, countdownPoi, cancel }
}
