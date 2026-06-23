import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRelativeTime } from '../../hooks/useRelativeTime.js'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useRelativeTime', () => {
  it('returns null text and not stale when timestamp is null', () => {
    const { result } = renderHook(() => useRelativeTime(null))
    expect(result.current).toEqual({ text: null, isStale: false })
  })

  it('returns null text and not stale when timestamp is 0 / falsy', () => {
    const { result } = renderHook(() => useRelativeTime(0))
    expect(result.current).toEqual({ text: null, isStale: false })
  })

  it('returns "0s ago" for a just-now timestamp', () => {
    const now = Date.now()
    const { result } = renderHook(() => useRelativeTime(now))
    expect(result.current.text).toBe('0s ago')
    expect(result.current.isStale).toBe(false)
  })

  it('is not stale when age is 9000 ms (age > 10_000 is false)', () => {
    const ts = Date.now() - 9000
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.isStale).toBe(false)
  })

  it('is stale when age is 10001 ms', () => {
    const ts = Date.now() - 10001
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.isStale).toBe(true)
  })

  it('formats seconds correctly for 30s ago', () => {
    const ts = Date.now() - 30000
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.text).toBe('30s ago')
    expect(result.current.isStale).toBe(true)
  })

  it('formats seconds correctly for 59s ago', () => {
    const ts = Date.now() - 59000
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.text).toBe('59s ago')
  })

  it('switches to minutes format at 60s', () => {
    const ts = Date.now() - 60000
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.text).toBe('1m ago')
  })

  it('formats 2 minutes correctly', () => {
    const ts = Date.now() - 120000
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.text).toBe('2m ago')
  })

  it('updates text when the interval fires', () => {
    const ts = Date.now() - 58000
    const { result } = renderHook(() => useRelativeTime(ts))
    expect(result.current.text).toBe('58s ago')
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.text).toBe('1m ago')
  })

  it('clears the interval on unmount (no timer leak)', () => {
    const ts = Date.now()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useRelativeTime(ts))
    unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
