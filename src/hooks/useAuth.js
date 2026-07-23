import { useCallback, useState } from 'react'
import { USERS } from '../config/users'

// The session lives under a fixed, persistent localStorage key so it survives a
// full app restart — important on mobile, where the OS routinely kills the
// backgrounded PWA/tab (which wipes sessionStorage). Losing that key was what
// forced drivers to log in again after every restart.
const PERSISTENT_KEY = 'taviranyito_session'

// Desktop controllers sometimes open several tabs, each pointing at a different
// drive. To keep those from clobbering each other we ALSO mirror the session
// into a per-tab key derived from a sessionStorage tab id. A tab prefers its own
// key (so divergent tabs stay divergent across F5), and falls back to the shared
// persistent key when the tab key is missing — e.g. right after a mobile restart.
function getTabSessionKey() {
  let tabId = sessionStorage.getItem('taviranyito_tab_id')
  if (!tabId) {
    tabId = Math.random().toString(36).slice(2)
    sessionStorage.setItem('taviranyito_tab_id', tabId)
  }
  return `${PERSISTENT_KEY}_${tabId}`
}

const TAB_KEY = getTabSessionKey()

function readSession() {
  for (const key of [TAB_KEY, PERSISTENT_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
      // fall through to the next key / null
    }
  }
  return null
}

function writeSession(session) {
  const raw = JSON.stringify(session)
  localStorage.setItem(PERSISTENT_KEY, raw)
  localStorage.setItem(TAB_KEY, raw)
}

function clearSession() {
  localStorage.removeItem(PERSISTENT_KEY)
  localStorage.removeItem(TAB_KEY)
}

export function useAuth() {
  const [session, setSession] = useState(readSession)

  const login = useCallback((username, password, role, driveId, driveName) => {
    if (!USERS[username] || USERS[username] !== password) {
      return 'Invalid username or password.'
    }
    const newSession = { username, role, pairKey: driveId, driveName }
    writeSession(newSession)
    setSession(newSession)
    return null
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  // Change the active drive without a full re-login: keeps username/role, swaps
  // the drive the session is pointing at.
  const switchDrive = useCallback((driveId, driveName) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, pairKey: driveId, driveName }
      writeSession(next)
      return next
    })
  }, [])

  return { session, login, logout, switchDrive }
}
