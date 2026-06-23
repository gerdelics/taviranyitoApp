import { useCallback, useState } from 'react'
import { USERS } from '../config/users'

const SESSION_KEY = 'taviranyito_session'

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

  return { session, login, logout }
}
