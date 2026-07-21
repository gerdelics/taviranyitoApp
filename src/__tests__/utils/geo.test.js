import { describe, it, expect } from 'vitest'
import { haversineKm, pointToSegmentKm } from '../../utils/geo.js'

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

describe('pointToSegmentKm', () => {
  const POI = { lat: 47.5, lon: 19.0 }

  it('is ~0 when the travelled segment passes through the point', () => {
    const a = { lat: 47.5, lon: 18.9985 }
    const b = { lat: 47.5, lon: 19.0015 }
    expect(pointToSegmentKm(POI, a, b)).toBeCloseTo(0, 2)
  })

  it('catches a drive-by that both endpoints miss', () => {
    const a = { lat: 47.5, lon: 18.9985 }
    const b = { lat: 47.5, lon: 19.0015 }
    // Both GPS fixes are ~110 m away — a point-only check would miss the POI...
    expect(haversineKm(POI, a)).toBeGreaterThan(0.1)
    expect(haversineKm(POI, b)).toBeGreaterThan(0.1)
    // ...but the segment between them passes within the 30 m threshold.
    expect(pointToSegmentKm(POI, a, b)).toBeLessThan(0.03)
  })

  it('returns the perpendicular distance for an offset parallel path', () => {
    // Path ~22 m north of the POI, spanning its longitude.
    const a = { lat: 47.5002, lon: 18.999 }
    const b = { lat: 47.5002, lon: 19.001 }
    const km = pointToSegmentKm(POI, a, b)
    expect(km).toBeGreaterThan(0.015)
    expect(km).toBeLessThan(0.03)
  })

  it('uses the nearest endpoint when the closest approach is past the segment', () => {
    // Segment lies entirely east of the POI, so endpoint a is closest.
    const a = { lat: 47.5, lon: 19.001 }
    const b = { lat: 47.5, lon: 19.002 }
    expect(pointToSegmentKm(POI, a, b)).toBeCloseTo(haversineKm(POI, a), 4)
  })

  it('falls back to the point-to-b distance when a is missing (first fix)', () => {
    const b = { lat: 47.5, lon: 19.001 }
    expect(pointToSegmentKm(POI, null, b)).toBeCloseTo(haversineKm(POI, b), 6)
    expect(pointToSegmentKm(POI, null, POI)).toBe(0)
  })

  it('returns 0 for missing point or destination coords', () => {
    expect(pointToSegmentKm(undefined, { lat: 47.5, lon: 19 }, { lat: 47.5, lon: 19 })).toBe(0)
    expect(pointToSegmentKm(POI, { lat: 47.5, lon: 19 }, null)).toBe(0)
  })
})
