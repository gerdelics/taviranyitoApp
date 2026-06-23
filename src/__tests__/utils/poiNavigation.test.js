import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildGoogleMapsNavLink, isMobileDevice, navigateToPoi } from '../../utils/poiNavigation.js'

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
