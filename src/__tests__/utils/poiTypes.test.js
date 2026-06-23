import { describe, it, expect } from 'vitest'
import { POI_TYPES, DEFAULT_POI_TYPE, getPoiTypeLabel } from '../../utils/poiTypes.js'

describe('POI_TYPES', () => {
  it('has exactly 3 types', () => {
    expect(POI_TYPES).toHaveLength(3)
  })

  it('DEFAULT_POI_TYPE is roadworks', () => {
    expect(DEFAULT_POI_TYPE).toBe('roadworks')
  })
})

describe('getPoiTypeLabel', () => {
  it('returns label for roadworks', () => {
    expect(getPoiTypeLabel('roadworks')).toBe('Roadworks')
  })

  it('returns label for closure', () => {
    expect(getPoiTypeLabel('closure')).toBe('Closure')
  })

  it('returns label for road-alert', () => {
    expect(getPoiTypeLabel('road-alert')).toBe('Road alert')
  })

  it('returns the raw value for unknown types', () => {
    expect(getPoiTypeLabel('xyz')).toBe('xyz')
  })

  it('returns Unknown for undefined', () => {
    expect(getPoiTypeLabel(undefined)).toBe('Unknown')
  })

  it('returns Unknown for empty string', () => {
    expect(getPoiTypeLabel('')).toBe('Unknown')
  })
})
