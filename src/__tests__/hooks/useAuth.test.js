import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth.js'

const SESSION_KEY = 'taviranyito_session'

beforeEach(() => {
  localStorage.clear()
})

describe('useAuth — initial state', () => {
  it('session is null when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toBeNull()
  })

  it('loads a persisted session from localStorage', () => {
    const stored = { username: 'sofor', role: 'driver', partner: 'iranyito', pairKey: 'iranyito-sofor' }
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
  it('returns null and sets session on valid sofor credentials', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('sofor', 'qwe123', 'driver') })
    expect(error).toBeNull()
    expect(result.current.session).toMatchObject({
      username: 'sofor',
      role: 'driver',
      partner: 'iranyito',
      pairKey: 'iranyito-sofor',
    })
  })

  it('returns null and sets session on valid iranyito credentials', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('iranyito', 'qwe123', 'controller') })
    expect(error).toBeNull()
    expect(result.current.session.pairKey).toBe('iranyito-sofor')
  })

  it('pairKey is the same regardless of which user logs in', () => {
    const { result: r1 } = renderHook(() => useAuth())
    const { result: r2 } = renderHook(() => useAuth())
    act(() => { r1.current.login('sofor', 'qwe123', 'driver') })
    act(() => { r2.current.login('iranyito', 'qwe123', 'controller') })
    expect(r1.current.session.pairKey).toBe(r2.current.session.pairKey)
  })

  it('returns an error string on wrong password', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('sofor', 'wrong', 'driver') })
    expect(typeof error).toBe('string')
    expect(error.length).toBeGreaterThan(0)
    expect(result.current.session).toBeNull()
  })

  it('returns an error string for an unknown username', () => {
    const { result } = renderHook(() => useAuth())
    let error
    act(() => { error = result.current.login('admin', 'qwe123', 'driver') })
    expect(typeof error).toBe('string')
    expect(result.current.session).toBeNull()
  })

  it('persists the session to localStorage', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('sofor', 'qwe123', 'driver') })
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY))
    expect(stored).toMatchObject({ username: 'sofor', role: 'driver' })
  })

  it('stores the role passed by the caller', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('sofor', 'qwe123', 'controller') })
    expect(result.current.session.role).toBe('controller')
  })
})

describe('useAuth — logout', () => {
  it('clears the session and removes it from localStorage', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.login('sofor', 'qwe123', 'driver') })
    expect(result.current.session).not.toBeNull()
    act(() => { result.current.logout() })
    expect(result.current.session).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})
