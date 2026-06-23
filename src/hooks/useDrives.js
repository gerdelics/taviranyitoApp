import { useEffect, useState } from 'react'
import { ref as dbRef, onValue, set, remove } from 'firebase/database'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../firebase'

export function useDrives(username) {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) {
      setDrives([])
      setLoading(false)
      return
    }
    const ref = dbRef(db, 'taviranyito/drives')
    const unsubscribe = onValue(ref, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setDrives([])
        setLoading(false)
        return
      }
      const list = Object.entries(data)
        .map(([id, d]) => ({ id, ...d }))
        .filter((d) => d.driver === username || d.controller === username)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      setDrives(list)
      setLoading(false)
    })
    return unsubscribe
  }, [username])

  return { drives, loading }
}

export function createDrive(name, driver, controller) {
  const id = uuidv4()
  set(dbRef(db, `taviranyito/drives/${id}`), {
    name: name.trim(),
    driver,
    controller,
    createdAt: Date.now(),
  })
  return id
}

export function archiveDrive(driveId) {
  return remove(dbRef(db, `taviranyito/drives/${driveId}`))
}
