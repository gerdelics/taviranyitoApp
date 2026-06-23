import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth.js'

const SESSION_KEY = 'taviranyito_session'
const MOCK_DRIVE_ID = 'test-drive-uuid-1234'
const MOCK_DRIVE_NAME = 'Frankfurt city drive'

beforeEach(() => {
  localStorage.clear()
})

describe('useAuth — initial state', () => {
  it('session is null when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toBeNull()
  })

  it('loads a persisted session from localStorage', () => {
    const stored = { username: 'gera', role: 'driver', pairKey: MOCK_DRIVE_ID, driveName: MOCK_DRIVE_NAME }
    localStorage.setItem(SESSION_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toEqual(stored)
  })

  it('returns null when localStorage contains malformed JSON', () => {
    localStorage.setItem(SESSION_KEY, 'not-json')
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toBeNull()
  })
})

describe('useAuth — login', () => {
  it('returns null and sets session on valid gera credentials', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('gera', 'qwe123', 'driver', MOCK_DRIVE_ID, MOCK_DRIVE_NAME) })
    expect(error).toBeNull()
    expect(result.current.session).toMatchObject({
      username: 'gera',
      role: 'driver',
      pairKey: MOCK_DRIVE_ID,
      driveName: MOCK_DRIVE_NAME,
    })
  })

  it('returns null and sets session on valid lacko credentials as controller', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('lacko', 'qwe123', 'controller', MOCK_DRIVE_ID, MOCK_DRIVE_NAME) })
    expect(error).toBeNull()
    expect(result.current.session.pairKey).toBe(MOCK_DRIVE_ID)
  })

  it('pairKey matches the driveId passed to login', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('gera', 'qwe123', 'driver', MOCK_DRIVE_ID, MOCK_DRIVE_NAME) })
    expect(result.current.session.pairKey).toBe(MOCK_DRIVE_ID)
  })

  it('returns an error string on wrong password', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('gera', 'wrong', 'driver', MOCK_DRIVE_ID) })
    expect(typeof error).toBe('string')
    expect(error.length).toBeGreaterThan(0)
    expect(result.current.session).toBeNull()
  })

  it('returns an error string for an unknown username', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('admin', 'qwe123', 'driver', MOCK_DRIVE_ID) })
    expect(typeof error).toBe('string')
    expect(result.current.session).toBeNull()
  })

  it('persists the session to localStorage', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('gera', 'qwe123', 'driver', MOCK_DRIVE_ID, MOCK_DRIVE_NAME) })
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY))
    expect(stored).toMatchObject({ username: 'gera', role: 'driver' })
  })

  it('stores the role passed by the caller', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('gera', 'qwe123', 'controller', MOCK_DRIVE_ID, MOCK_DRIVE_NAME) })
    expect(result.current.session.role).toBe('controller')
  })

  it('all six users can log in with the shared password', () => {
    const users = ['gera', 'lacko', 'gabi', 'lacc', 'zoli', 'petrusz']
    for (const user of users) {
      localStorage.clear()
      const { result } = renderHook(() => useAuth())
      let error
      act(() => { error = result.current.login(user, 'qwe123', 'driver', MOCK_DRIVE_ID) })
      expect(error).toBeNull()
    }
  })
})

describe('useAuth — logout', () => {
  it('clears the session and removes it from localStorage', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('gera', 'qwe123', 'driver', MOCK_DRIVE_ID) })
    expect(result.current.session).not.toBeNull()
    act(() => { result.current.logout() })
    expect(result.current.session).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})
