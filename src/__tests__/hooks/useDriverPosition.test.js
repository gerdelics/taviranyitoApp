import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../firebase.js', () => ({ db: {} }))

const mockRef = vi.fn(() => 'mock-ref')
const mockOnValue = vi.fn()
const mockSet = vi.fn(() => Promise.resolve())

vi.mock('firebase/database', () => ({
  ref: mockRef,
  onValue: mockOnValue,
  set: mockSet,
}))

const { useDriverPosition } = await import('../../hooks/useDriverPosition.js')

const PAIR_KEY = 'iranyito-sofor'
const LOCATION = { lat: 47.4979, lon: 19.0402, accuracy: 5 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDriverPosition — driver role', () => {
  it('calls firebase set with driver position', () => {
    renderHook(() => useDriverPosition(PAIR_KEY, 'driver', LOCATION))
    expect(mockSet).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
      lat: LOCATION.lat,
      lon: LOCATION.lon,
      accuracy: LOCATION.accuracy,
    }))
  })

  it('does not call set when location is null', () => {
    renderHook(() => useDriverPosition(PAIR_KEY, 'driver', null))
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('does not call set when pairKey is null', () => {
    renderHook(() => useDriverPosition(null, 'driver', LOCATION))
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('does not subscribe via onValue for driver role', () => {
    renderHook(() => useDriverPosition(PAIR_KEY, 'driver', LOCATION))
    expect(mockOnValue).not.toHaveBeenCalled()
  })

  it('returns null for the driver role', () => {
    const { result } = renderHook(() => useDriverPosition(PAIR_KEY, 'driver', LOCATION))
    expect(result.current).toBeNull()
  })

  it('respects the rate limit — does not call set twice within writeIntervalMs', () => {
    const { rerender } = renderHook(
      ({ loc }) => useDriverPosition(PAIR_KEY, 'driver', loc, 3000),
      { initialProps: { loc: LOCATION } },
    )
    expect(mockSet).toHaveBeenCalledTimes(1)
    rerender({ loc: { ...LOCATION, lat: 47.5 } })
    expect(mockSet).toHaveBeenCalledTimes(1)
  })
})

describe('useDriverPosition — controller role', () => {
  it('subscribes via onValue for the controller role', () => {
    mockOnValue.mockReturnValue(vi.fn())
    renderHook(() => useDriverPosition(PAIR_KEY, 'controller', null))
    expect(mockOnValue).toHaveBeenCalled()
  })

  it('does not subscribe via onValue when pairKey is null', () => {
    renderHook(() => useDriverPosition(null, 'controller', null))
    expect(mockOnValue).not.toHaveBeenCalled()
  })

  it('returns driver position from snapshot', () => {
    let cb
    mockOnValue.mockImplementation((_ref, callback) => {
      cb = callback
      return vi.fn()
    })
    const { result } = renderHook(() => useDriverPosition(PAIR_KEY, 'controller', null))
    act(() => { cb({ val: () => ({ lat: 47.5, lon: 19.1, accuracy: 10, timestamp: 1000 }) }) })
    expect(result.current).toMatchObject({ lat: 47.5, lon: 19.1 })
  })

  it('calls the unsubscribe on unmount', () => {
    const unsub = vi.fn()
    mockOnValue.mockReturnValue(unsub)
    const { unmount } = renderHook(() => useDriverPosition(PAIR_KEY, 'controller', null))
    unmount()
    expect(unsub).toHaveBeenCalled()
  })
})
