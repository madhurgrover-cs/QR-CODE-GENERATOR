import { describe, expect, it } from 'vitest'
import { contrastRatio, getWarnings, hexToRgb } from '../lib/readability'
import { DEFAULT_STYLE, type QRStyle } from '../lib/style'

const s = (patch: Partial<QRStyle>): QRStyle => ({ ...DEFAULT_STYLE, ...patch })
const ids = (style: QRStyle, payload = 'https://example.com') => getWarnings(style, payload).map((w) => w.id)

describe('colour helpers', () => {
  it('parses hex colours', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
    expect(hexToRgb('#4f46e5')).toEqual([79, 70, 229])
    expect(hexToRgb('nope')).toBeNull()
  })
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })
})

describe('readability warnings', () => {
  it('default style has no warnings', () => {
    expect(ids(DEFAULT_STYLE)).toEqual([])
  })
  it('flags low and very low contrast', () => {
    expect(getWarnings(s({ fgColor: '#cccccc' }), 'x').find((w) => w.id === 'contrast')?.severity).toBe('error')
    expect(getWarnings(s({ fgColor: '#888888' }), 'x').find((w) => w.id === 'contrast')?.severity).toBe('warning')
  })
  it('checks both gradient colours', () => {
    expect(ids(s({ gradient: true, gradientColor: '#eeeeee' }))).toContain('contrast')
    expect(ids(s({ gradient: false, gradientColor: '#eeeeee' }))).not.toContain('contrast')
  })
  it('flags inverted colours', () => {
    expect(ids(s({ fgColor: '#ffffff', bgColor: '#000000' }))).toContain('inverted')
  })
  it('flags small margins and small sizes', () => {
    expect(ids(s({ margin: 0 }))).toContain('margin')
    expect(ids(s({ size: 100 }))).toContain('size')
  })
  it('flags dense codes and over-capacity content', () => {
    expect(ids(s({ size: 150, margin: 4 }), 'x'.repeat(1500))).toContain('density')
    const w = getWarnings(s({ ecLevel: 'H' }), 'x'.repeat(1300))
    expect(w.find((x) => x.id === 'capacity')?.severity).toBe('error')
    expect(ids(s({ ecLevel: 'L' }), 'x'.repeat(1300))).not.toContain('capacity')
  })
  it('flags logos with low error correction or large size', () => {
    expect(ids(s({ logo: 'data:', ecLevel: 'M' }))).toContain('logo-ec')
    expect(ids(s({ logo: 'data:', ecLevel: 'H' }))).not.toContain('logo-ec')
    expect(ids(s({ logo: 'data:', ecLevel: 'H', logoSize: 0.45 }))).toContain('logo-size')
  })
})
