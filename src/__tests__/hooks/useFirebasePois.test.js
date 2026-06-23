import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../firebase.js', () => ({ db: {} }))
vi.mock('uuid', () => ({ v4: () => 'test-uuid-1' }))

const mockRef = vi.fn(() => 'mock-ref')
const mockOnValue = vi.fn()
const mockSet = vi.fn(() => Promise.resolve())
const mockUpdate = vi.fn(() => Promise.resolve())
const mockRemove = vi.fn(() => Promise.resolve())

vi.mock('firebase/database', () => ({
  ref: mockRef,
  onValue: mockOnValue,
  set: mockSet,
  update: mockUpdate,
  remove: mockRemove,
}))

// Must import after vi.mock calls
const { useFirebasePois } = await import('../../hooks/useFirebasePois.js')

function makeSnapshot(data) {
  return { val: () => data }
}

function captureOnValueCallback() {
  let cb
  mockOnValue.mockImplementation((_ref, callback) => {
    cb = callback
    return vi.fn()
  })
  return () => cb
}

const PAIR_KEY = 'iranyito-sofor'
const LOCATION = { lat: 47.4979, lon: 19.0402 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useFirebasePois — subscription', () => {
  it('does not call onValue when pairKey is null', () => {
    renderHook(() => useFirebasePois(null))
    expect(mockOnValue).not.toHaveBeenCalled()
  })

  it('starts with an empty pois array when pairKey is null', () => {
    const { result } = renderHook(() => useFirebasePois(null))
    expect(result.current.pois).toEqual([])
  })

  it('sorts pois by order field when present', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    const data = {
      b: { id: 'b', lat: 1, lon: 2, done: false, createdAt: 1000, published: false, order: 1 },
      a: { id: 'a', lat: 1, lon: 2, done: false, createdAt: 2000, published: false, order: 0 },
    }
    act(() => { onValueCb(makeSnapshot(data)) })
    expect(result.current.pois[0].id).toBe('a')
    expect(result.current.pois[1].id).toBe('b')
  })

  it('falls back to createdAt sort for pois without order field', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    const data = {
      b: { id: 'b', lat: 1, lon: 2, done: false, createdAt: 2000, published: false },
      a: { id: 'a', lat: 1, lon: 2, done: false, createdAt: 1000, published: false },
    }
    act(() => { onValueCb(makeSnapshot(data)) })
    expect(result.current.pois[0].id).toBe('a')
    expect(result.current.pois[1].id).toBe('b')
  })

  it('places pois without order after pois with order', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    const data = {
      noOrder: { id: 'noOrder', lat: 1, lon: 2, done: false, createdAt: 1000, published: false },
      withOrder: { id: 'withOrder', lat: 1, lon: 2, done: false, createdAt: 9000, published: false, order: 0 },
    }
    act(() => { onValueCb(makeSnapshot(data)) })
    expect(result.current.pois[0].id).toBe('withOrder')
    expect(result.current.pois[1].id).toBe('noOrder')
  })

  it('normalizes missing approach to null', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => {
      onValueCb(makeSnapshot({ a: { id: 'a', lat: 1, lon: 2, done: false, createdAt: 1000, published: false } }))
    })
    expect(result.current.pois[0].approach).toBeNull()
  })

  it('sets pois to empty array when snapshot is null', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { onValueCb(makeSnapshot(null)) })
    expect(result.current.pois).toEqual([])
  })

  it('calls onNewPoi for a new published POI on the second snapshot', () => {
    const onNewPoi = vi.fn()
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    renderHook(() => useFirebasePois(PAIR_KEY, { onNewPoi }))

    const poi = { id: 'p1', lat: 1, lon: 2, done: false, createdAt: 1000, published: true }
    act(() => { onValueCb(makeSnapshot(null)) })
    expect(onNewPoi).not.toHaveBeenCalled()
    act(() => { onValueCb(makeSnapshot({ p1: poi })) })
    expect(onNewPoi).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
  })

  it('does not call onNewPoi on the very first snapshot', () => {
    const onNewPoi = vi.fn()
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    renderHook(() => useFirebasePois(PAIR_KEY, { onNewPoi }))
    const poi = { id: 'p1', lat: 1, lon: 2, done: false, createdAt: 1000, published: true }
    act(() => { onValueCb(makeSnapshot({ p1: poi })) })
    expect(onNewPoi).not.toHaveBeenCalled()
  })

  it('does not call onNewPoi for a POI already seen as published', () => {
    const onNewPoi = vi.fn()
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    renderHook(() => useFirebasePois(PAIR_KEY, { onNewPoi }))
    const poi = { id: 'p1', lat: 1, lon: 2, done: false, createdAt: 1000, published: true }
    act(() => { onValueCb(makeSnapshot(null)) })
    act(() => { onValueCb(makeSnapshot({ p1: poi })) })
    act(() => { onValueCb(makeSnapshot({ p1: poi })) })
    expect(onNewPoi).toHaveBeenCalledTimes(1)
  })

  it('calls the unsubscribe function on unmount', () => {
    const unsubscribe = vi.fn()
    mockOnValue.mockReturnValue(unsubscribe)
    const { unmount } = renderHook(() => useFirebasePois(PAIR_KEY))
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('useFirebasePois — addPoi', () => {
  it('calls firebase set with correct path and returns poi object', () => {
    renderHook(() => useFirebasePois(null))
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    let poi
    act(() => { poi = result.current.addPoi(47.49, 19.04) })
    expect(mockSet).toHaveBeenCalledWith('mock-ref', expect.objectContaining({ id: 'test-uuid-1', lat: 47.49, lon: 19.04 }))
    expect(poi).toMatchObject({ id: 'test-uuid-1', lat: 47.49, lon: 19.04 })
  })

  it('assigns order = current pois count when adding', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => {
      onValueCb(makeSnapshot({
        a: { id: 'a', lat: 1, lon: 2, done: false, createdAt: 1000, published: false, order: 0 },
        b: { id: 'b', lat: 1, lon: 2, done: false, createdAt: 2000, published: false, order: 1 },
      }))
    })
    act(() => { result.current.addPoi(47.49, 19.04) })
    expect(mockSet).toHaveBeenCalledWith('mock-ref', expect.objectContaining({ order: 2 }))
  })

  it('returns null and does not call set for NaN lat', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    let poi
    act(() => { poi = result.current.addPoi(NaN, 19.04) })
    expect(mockSet).not.toHaveBeenCalled()
    expect(poi).toBeNull()
  })

  it('returns null and does not call set when pairKey is null', () => {
    const { result } = renderHook(() => useFirebasePois(null))
    let poi
    act(() => { poi = result.current.addPoi(47.49, 19.04) })
    expect(mockSet).not.toHaveBeenCalled()
    expect(poi).toBeNull()
  })

  it('trims whitespace from description', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { result.current.addPoi(47.49, 19.04, { description: '  foo  ' }) })
    expect(mockSet).toHaveBeenCalledWith('mock-ref', expect.objectContaining({ description: 'foo' }))
  })

  it('returned poi always has approach: null when no approach provided', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    let poi
    act(() => { poi = result.current.addPoi(47.49, 19.04) })
    expect(poi.approach).toBeNull()
  })

  it('includes approach in the firebase payload when provided', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    const approach = { lat: 47.5, lon: 19.1 }
    act(() => { result.current.addPoi(47.49, 19.04, { approach }) })
    expect(mockSet).toHaveBeenCalledWith('mock-ref', expect.objectContaining({ approach }))
  })
})

describe('useFirebasePois — reorderPois', () => {
  it('calls firebase update with order indices for each id', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { result.current.reorderPois(['b', 'a']) })
    expect(mockUpdate).toHaveBeenCalledWith('mock-ref', { 'b/order': 0, 'a/order': 1 })
  })

  it('does not call update when pairKey is null', () => {
    const { result } = renderHook(() => useFirebasePois(null))
    act(() => { result.current.reorderPois(['a', 'b']) })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('updates the pois root path', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { result.current.reorderPois(['a']) })
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), `taviranyito/drives/${PAIR_KEY}/pois`)
  })
})

describe('useFirebasePois — editPoi / deletePoi / clearAll', () => {
  it('editPoi calls firebase update', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { result.current.editPoi('p1', { done: true }) })
    expect(mockUpdate).toHaveBeenCalledWith('mock-ref', { done: true })
  })

  it('editPoi does not call update when pairKey is null', () => {
    const { result } = renderHook(() => useFirebasePois(null))
    act(() => { result.current.editPoi('p1', { done: true }) })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('deletePoi calls firebase remove', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { result.current.deletePoi('p1') })
    expect(mockRemove).toHaveBeenCalled()
  })

  it('clearAll calls firebase remove on pois root', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => { result.current.clearAll() })
    expect(mockRemove).toHaveBeenCalled()
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), `taviranyito/drives/${PAIR_KEY}/pois`)
  })
})

describe('useFirebasePois — getNearestId', () => {
  it('returns null when location is null', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    expect(result.current.getNearestId(null)).toBeNull()
  })

  it('returns null when location has NaN coords', () => {
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    expect(result.current.getNearestId({ lat: NaN, lon: 19 })).toBeNull()
  })

  it('returns the id of the single undone POI', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => {
      onValueCb(makeSnapshot({
        a: { id: 'a', lat: 47.4979, lon: 19.0402, done: false, createdAt: 1000, published: false },
      }))
    })
    expect(result.current.getNearestId(LOCATION)).toBe('a')
  })

  it('skips done POIs', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => {
      onValueCb(makeSnapshot({
        near: { id: 'near', lat: 47.4979, lon: 19.0402, done: true, createdAt: 1000, published: false },
        far: { id: 'far', lat: 47.6, lon: 19.2, done: false, createdAt: 2000, published: false },
      }))
    })
    expect(result.current.getNearestId(LOCATION)).toBe('far')
  })

  it('picks the geometrically nearest undone POI', () => {
    let onValueCb
    mockOnValue.mockImplementation((_ref, cb) => { onValueCb = cb; return vi.fn() })
    const { result } = renderHook(() => useFirebasePois(PAIR_KEY))
    act(() => {
      onValueCb(makeSnapshot({
        near: { id: 'near', lat: 47.4980, lon: 19.0403, done: false, createdAt: 1000, published: false },
        far: { id: 'far', lat: 47.6, lon: 19.2, done: false, createdAt: 2000, published: false },
      }))
    })
    expect(result.current.getNearestId(LOCATION)).toBe('near')
  })
})
