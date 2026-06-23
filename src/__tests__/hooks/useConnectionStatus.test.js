import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../firebase.js', () => ({ db: {} }))

const mockRef = vi.fn(() => 'mock-ref')
const mockOnValue = vi.fn()

vi.mock('firebase/database', () => ({
  ref: mockRef,
  onValue: mockOnValue,
}))

const { useConnectionStatus } = await import('../../hooks/useConnectionStatus.js')

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useConnectionStatus — online flag', () => {
  it('is online by default when navigator.onLine is true', () => {
    mockOnValue.mockReturnValue(vi.fn())
    const { result } = renderHook(() => useConnectionStatus())
    expect(result.current.online).toBe(true)
  })

  it('sets online to false on offline event', () => {
    mockOnValue.mockReturnValue(vi.fn())
    const { result } = renderHook(() => useConnectionStatus())
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current.online).toBe(false)
  })

  it('sets online to true on online event', () => {
    mockOnValue.mockReturnValue(vi.fn())
    const { result } = renderHook(() => useConnectionStatus())
    act(() => { window.dispatchEvent(new Event('offline')) })
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(result.current.online).toBe(true)
  })
})

describe('useConnectionStatus — Firebase connection', () => {
  it('firebaseConnected is true initially', () => {
    mockOnValue.mockReturnValue(vi.fn())
    const { result } = renderHook(() => useConnectionStatus())
    expect(result.current.firebaseConnected).toBe(true)
  })

  it('stays true when firebase fires true', () => {
    let cb
    mockOnValue.mockImplementation((_ref, callback) => { cb = callback; return vi.fn() })
    const { result } = renderHook(() => useConnectionStatus())
    act(() => { cb({ val: () => true }) })
    expect(result.current.firebaseConnected).toBe(true)
  })

  it('stays true within 2000ms after firebase fires false (debounce)', () => {
    let cb
    mockOnValue.mockImplementation((_ref, callback) => { cb = callback; return vi.fn() })
    const { result } = renderHook(() => useConnectionStatus())
    act(() => { cb({ val: () => true }) })
    act(() => { cb({ val: () => false }) })
    act(() => { vi.advanceTimersByTime(1999) })
    expect(result.current.firebaseConnected).toBe(true)
  })

  it('becomes false after 2000ms debounce', () => {
    let cb
    mockOnValue.mockImplementation((_ref, callback) => { cb = callback; return vi.fn() })
    const { result } = renderHook(() => useConnectionStatus())
    act(() => { cb({ val: () => true }) })
    act(() => { cb({ val: () => false }) })
    act(() => { vi.advanceTimersByTime(2001) })
    expect(result.current.firebaseConnected).toBe(false)
  })

  it('cancels debounce when firebase reconnects within 2s', () => {
    let cb
    mockOnValue.mockImplementation((_ref, callback) => { cb = callback; return vi.fn() })
    const { result } = renderHook(() => useConnectionStatus())
    act(() => { cb({ val: () => true }) })
    act(() => { cb({ val: () => false }) })
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { cb({ val: () => true }) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.firebaseConnected).toBe(true)
  })

  it('calls unsubscribe and clearTimeout on unmount', () => {
    const unsub = vi.fn()
    mockOnValue.mockReturnValue(unsub)
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { unmount } = renderHook(() => useConnectionStatus())
    unmount()
    expect(unsub).toHaveBeenCalled()
    expect(clearSpy).toHaveBeenCalled()
  })
})
