import { describe, it, expect } from 'vitest'
import { parseCoordinates } from '../../utils/coordinates.js'

describe('parseCoordinates', () => {
  it('parses standard "lat, lon" format', () => {
    expect(parseCoordinates('47.4979, 19.0402')).toEqual({ lat: 47.4979, lon: 19.0402 })
  })

  it('parses tab-separated values', () => {
    expect(parseCoordinates('47.4979\t19.0402')).toEqual({ lat: 47.4979, lon: 19.0402 })
  })

  it('parses multiple-space-separated values', () => {
    expect(parseCoordinates('47.4979   19.0402')).toEqual({ lat: 47.4979, lon: 19.0402 })
  })

  it('takes the first two parts when more are present', () => {
    expect(parseCoordinates('47.49, 19.04, extra')).toEqual({ lat: 47.49, lon: 19.04 })
  })

  it('returns null for a single token', () => {
    expect(parseCoordinates('47.4979')).toBeNull()
  })

  it('returns null for non-numeric content', () => {
    expect(parseCoordinates('abc, def')).toBeNull()
  })

  it('returns null for a number input', () => {
    expect(parseCoordinates(12345)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(parseCoordinates(null)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseCoordinates('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(parseCoordinates('   ')).toBeNull()
  })

  it('parses negative coordinates', () => {
    expect(parseCoordinates('-33.8688, 151.2093')).toEqual({ lat: -33.8688, lon: 151.2093 })
  })

  it('trims surrounding whitespace', () => {
    expect(parseCoordinates('  47.4979, 19.0402  ')).toEqual({ lat: 47.4979, lon: 19.0402 })
  })
})
