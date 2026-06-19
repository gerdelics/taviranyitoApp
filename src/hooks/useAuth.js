import { useCallback, useState } from 'react'

const USERS = { gera: 'qwe123', gabi: 'qwe123' }
const PARTNER = { gera: 'gabi', gabi: 'gera' }
const SESSION_KEY = 'taviranyito_session'

export function useAuth() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null
    } catch {
      return null
    }
  })

  const login = useCallback((username, password, role) => {
    if (!USERS[username] || USERS[username] !== password) {
      return 'Hibás felhasználónév vagy jelszó.'
    }
    const partner = PARTNER[username]
    const pairKey = [username, partner].sort().join('-')
    const newSession = { username, role, partner, pairKey }
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
