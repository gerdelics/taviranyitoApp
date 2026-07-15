import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildAndroidNavUri,
  buildGoogleMapsNavLink,
  buildRouteLink,
  buildRouteLinks,
  buildWebDirLink,
  getMobilePlatform,
  isMobileDevice,
  navigateToPoi,
  navigateToPoiWithNext,
} from '../../utils/poiNavigation.js'

const DEST = { lat: 47.4979, lon: 19.0402 }
const WAYPOINT = { lat: 47.5, lon: 19.1 }

describe('buildGoogleMapsNavLink', () => {
  it('contains the destination when no waypoint provided', () => {
    const url = buildGoogleMapsNavLink(DEST)
    expect(url).toContain('destination=47.4979%2C19.0402')
    expect(url).not.toContain('waypoints')
  })

  it('contains both destination and waypoints when a valid waypoint is given', () => {
    const url = buildGoogleMapsNavLink(DEST, WAYPOINT)
    expect(url).toContain('destination=')
    expect(url).toContain('waypoints=')
  })

  it('omits waypoints when waypoint is null', () => {
    const url = buildGoogleMapsNavLink(DEST, null)
    expect(url).not.toContain('waypoints')
  })

  it('omits waypoints when waypoint has NaN lon', () => {
    const url = buildGoogleMapsNavLink(DEST, { lat: 47.5, lon: NaN })
    expect(url).not.toContain('waypoints')
  })

  it('starts with the Google Maps dir URL', () => {
    const url = buildGoogleMapsNavLink(DEST)
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//)
  })
})

describe('buildWebDirLink', () => {
  it('joins multiple valid waypoints with a pipe in order', () => {
    const a = { lat: 47.1, lon: 19.1 }
    const b = { lat: 47.2, lon: 19.2 }
    const url = buildWebDirLink(DEST, [a, b])
    expect(url).toContain('destination=47.4979%2C19.0402')
    expect(url).toContain('waypoints=47.1%2C19.1%7C47.2%2C19.2')
  })

  it('drops invalid waypoints and omits the param when none remain', () => {
    const url = buildWebDirLink(DEST, [null, { lat: 47.5, lon: NaN }])
    expect(url).not.toContain('waypoints')
  })
})

describe('buildAndroidNavUri', () => {
  it('builds a google.navigation intent to the destination', () => {
    const uri = buildAndroidNavUri(DEST)
    expect(uri).toBe('google.navigation:q=47.4979,19.0402&mode=d')
  })

  it('appends valid waypoints in order, dropping invalid ones', () => {
    const a = { lat: 47.1, lon: 19.1 }
    const uri = buildAndroidNavUri(DEST, [a, null, WAYPOINT])
    expect(uri).toBe('google.navigation:q=47.4979,19.0402&mode=d&waypoints=47.1,19.1|47.5,19.1')
  })
})

describe('getMobilePlatform', () => {
  const origUA = navigator.userAgent
  const setUA = (value) =>
    Object.defineProperty(navigator, 'userAgent', { value, configurable: true })

  afterEach(() => setUA(origUA))

  it('detects android', () => {
    setUA('Mozilla/5.0 (Linux; Android 11; Pixel 5)')
    expect(getMobilePlatform()).toBe('android')
  })

  it('detects ios', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)')
    expect(getMobilePlatform()).toBe('ios')
  })

  it('returns null on desktop', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    expect(getMobilePlatform()).toBe(null)
  })
})

describe('buildRouteLink', () => {
  const points = [
    { lat: 47.1, lon: 19.1 },
    { lat: 47.2, lon: 19.2 },
    { lat: 47.3, lon: 19.3 },
  ]

  it('uses first as origin, last as destination, middle as waypoints', () => {
    const url = buildRouteLink(points)
    expect(url).toContain('origin=47.1%2C19.1')
    expect(url).toContain('destination=47.3%2C19.3')
    expect(url).toContain('waypoints=47.2%2C19.2')
  })

  it('omits waypoints for a two-point route', () => {
    const url = buildRouteLink([points[0], points[2]])
    expect(url).toContain('origin=47.1%2C19.1')
    expect(url).toContain('destination=47.3%2C19.3')
    expect(url).not.toContain('waypoints')
  })
})

describe('buildRouteLinks', () => {
  const makePoints = (n) =>
    Array.from({ length: n }, (_, i) => ({ lat: 47 + i / 100, lon: 19 + i / 100 }))

  it('returns [] for fewer than two points', () => {
    expect(buildRouteLinks([])).toEqual([])
    expect(buildRouteLinks([{ lat: 47, lon: 19 }])).toEqual([])
  })

  it('produces a single link when within the stop limit', () => {
    expect(buildRouteLinks(makePoints(10))).toHaveLength(1)
  })

  it('splits into overlapping segments beyond the stop limit', () => {
    // 20 stops, segments of 10 overlapping by one → 3 links
    expect(buildRouteLinks(makePoints(20))).toHaveLength(3)
    // 15 stops → 2 links
    expect(buildRouteLinks(makePoints(15))).toHaveLength(2)
  })
})

describe('isMobileDevice', () => {
  const origUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: origUA, configurable: true })
  })

  it('returns false for a desktop Windows UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    })
    expect(isMobileDevice()).toBe(false)
  })

  it('returns true for an Android UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)',
      configurable: true,
    })
    expect(isMobileDevice()).toBe(true)
  })

  it('returns true for an iPhone UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      configurable: true,
    })
    expect(isMobileDevice()).toBe(true)
  })
})

describe('navigateToPoi', () => {
  const poi = { ...DEST, approach: null }

  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0)',
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets window.location.href and returns opened on mobile', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 11)',
      configurable: true,
    })
    const hrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { set href(v) { hrefSetter(v) } },
      configurable: true,
    })
    const result = await navigateToPoi(poi)
    expect(hrefSetter).toHaveBeenCalled()
    expect(result).toBe('opened')
  })

  it('returns true on desktop when clipboard write succeeds', async () => {
    navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    const result = await navigateToPoi(poi)
    expect(result).toBe(true)
  })

  it('returns false on desktop when clipboard write fails', async () => {
    navigator.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
    const result = await navigateToPoi(poi)
    expect(result).toBe(false)
  })
})

describe('navigateToPoiWithNext', () => {
  const current = { lat: 47.4, lon: 19.0, approach: { lat: 47.41, lon: 19.01 } }
  const next = { lat: 47.6, lon: 19.2, approach: null }

  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0)',
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to a plain drive when there is no next POI', async () => {
    navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    await navigateToPoiWithNext(current, null)
    const link = navigator.clipboard.writeText.mock.calls[0][0]
    expect(link).toContain('destination=47.4%2C19')
    // only the current approach is a waypoint, current POI is the destination
    expect(link).toContain('waypoints=47.41%2C19.01')
  })

  it('routes through the current POI to the next as destination', async () => {
    navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    await navigateToPoiWithNext(current, next)
    const link = navigator.clipboard.writeText.mock.calls[0][0]
    // next POI is the final destination
    expect(link).toContain('destination=47.6%2C19.2')
    // waypoints in order: current approach then current POI (next has no approach)
    expect(link).toContain('waypoints=47.41%2C19.01%7C47.4%2C19')
  })

  it('uses the native android intent on android', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 11)',
      configurable: true,
    })
    let href = null
    Object.defineProperty(window, 'location', {
      value: { set href(v) { href = v } },
      configurable: true,
    })
    const result = await navigateToPoiWithNext(current, next)
    expect(result).toBe('opened')
    expect(href).toContain('google.navigation:q=47.6,19.2')
    expect(href).toContain('waypoints=47.41,19.01|47.4,19')
  })
})
