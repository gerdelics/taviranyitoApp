import { useCallback, useState } from 'react'
import { USERS } from '../config/users'

// Each browser tab gets a unique ID stored in sessionStorage (survives F5,
// dies when the tab is closed). This makes the localStorage key tab-specific,
// giving per-tab session isolation without losing persistence across reloads.
function getTabSessionKey() {
  let tabId = sessionStorage.getItem('taviranyito_tab_id')
  if (!tabId) {
    tabId = Math.random().toString(36).slice(2)
    sessionStorage.setItem('taviranyito_tab_id', tabId)
  }
  return `taviranyito_session_${tabId}`
}

const SESSION_KEY = getTabSessionKey()

export function useAuth() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null
    } catch {
      return null
    }
  })

  const login = useCallback((username, password, role, driveId, driveName) => {
    if (!USERS[username] || USERS[username] !== password) {
      return 'Invalid username or password.'
    }
    const newSession = { username, role, pairKey: driveId, driveName }
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    setSession(newSession)
    return null
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  // Change the active drive without a full re-login: keeps username/role, swaps
  // the drive the session is pointing at.
  const switchDrive = useCallback((driveId, driveName) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, pairKey: driveId, driveName }
      localStorage.setItem(SESSION_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { session, login, logout, switchDrive }
}
