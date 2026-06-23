import { describe, it, expect } from 'vitest'
import { haversineKm } from '../../utils/geo.js'

const BUDAPEST_KELETI = { lat: 47.5003, lon: 19.0838 }
const BUDAPEST_KELENVOLGY = { lat: 47.4744, lon: 18.9987 }

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm({ lat: 47.4979, lon: 19.0402 }, { lat: 47.4979, lon: 19.0402 })).toBe(0)
  })

  it('returns a reasonable distance between two Budapest stations', () => {
    const km = haversineKm(BUDAPEST_KELETI, BUDAPEST_KELENVOLGY)
    expect(km).toBeGreaterThan(5)
    expect(km).toBeLessThan(12)
  })

  it('returns ~20015 km for antipodal points', () => {
    const km = haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })
    expect(km).toBeCloseTo(20015, -1)
  })

  it('returns 0 when pointA is undefined', () => {
    expect(haversineKm(undefined, BUDAPEST_KELETI)).toBe(0)
  })

  it('returns 0 when pointA has null lat', () => {
    expect(haversineKm({ lat: null, lon: 19 }, BUDAPEST_KELETI)).toBe(0)
  })

  it('returns 0 when a coord is NaN', () => {
    expect(haversineKm({ lat: NaN, lon: 19 }, BUDAPEST_KELETI)).toBe(0)
  })

  it('returns 0 when a coord is a string (Number.isFinite rejects it)', () => {
    expect(haversineKm({ lat: '47', lon: 19 }, BUDAPEST_KELETI)).toBe(0)
  })

  it('returns 0 when pointB is null', () => {
    expect(haversineKm(BUDAPEST_KELETI, null)).toBe(0)
  })

  it('handles cross-hemisphere coords', () => {
    const sydney = { lat: -33.8688, lon: 151.2093 }
    const km = haversineKm(BUDAPEST_KELETI, sydney)
    expect(km).toBeGreaterThan(14000)
    expect(km).toBeLessThan(16000)
  })
})
