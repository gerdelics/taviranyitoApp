import { useEffect, useState } from 'react'
import { ref as dbRef, onValue } from 'firebase/database'
import { db } from '../firebase'

export function useConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [firebaseConnected, setFirebaseConnected] = useState(true)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    let wasConnected = false
    let timer = null
    const unsubscribe = onValue(dbRef(db, '.info/connected'), (snap) => {
      if (snap.val() === true) {
        clearTimeout(timer)
        wasConnected = true
        setFirebaseConnected(true)
      } else if (wasConnected) {
        // debounce: avoid false flash while reconnecting
        timer = setTimeout(() => setFirebaseConnected(false), 2000)
      }
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  return { online, firebaseConnected }
}
