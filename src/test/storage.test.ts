import { describe, expect, it, vi } from 'vitest'
import { EMPTY_VALUES } from '../lib/qrData'
import { MAX_RECENT, RECENT_KEY, addRecent, loadRecent, saveRecent, type RecentQR } from '../lib/storage'
import { DEFAULT_STYLE, PRESETS, applyPreset, matchesPreset } from '../lib/style'

const entry = (payload: string): Omit<RecentQR, 'id' | 'createdAt'> => ({
  type: 'text',
  values: { ...EMPTY_VALUES, text: payload },
  style: DEFAULT_STYLE,
  payload,
  label: payload,
  thumbnail: 'data:image/png;base64,',
})

describe('recent QR storage', () => {
  it('persists and reloads entries (survives refresh)', () => {
    const list = saveRecent(addRecent([], entry('a')))
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toHaveLength(1)
    const reloaded = loadRecent()
    expect(reloaded[0].payload).toBe('a')
    expect(reloaded).toEqual(list)
  })

  it('puts newest first and de-duplicates identical codes', () => {
    let list = addRecent([], entry('a'))
    list = addRecent(list, entry('b'))
    list = addRecent(list, entry('a'))
    expect(list.map((r) => r.payload)).toEqual(['a', 'b'])
  })

  it('keeps the same content with a different style as a separate entry', () => {
    let list = addRecent([], entry('a'))
    list = addRecent(list, { ...entry('a'), style: { ...DEFAULT_STYLE, fgColor: '#123456' } })
    expect(list).toHaveLength(2)
  })

  it(`caps the list at ${MAX_RECENT}`, () => {
    let list: RecentQR[] = []
    for (let i = 0; i < MAX_RECENT + 5; i++) list = addRecent(list, entry(String(i)))
    expect(list).toHaveLength(MAX_RECENT)
    expect(list[0].payload).toBe(String(MAX_RECENT + 4))
  })

  it('ignores corrupt data', () => {
    localStorage.setItem(RECENT_KEY, '{not json')
    expect(loadRecent()).toEqual([])
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ nope: true }, null]))
    expect(loadRecent()).toEqual([])
  })

  it('drops oldest entries when storage is full', () => {
    let list: RecentQR[] = []
    for (let i = 0; i < 3; i++) list = addRecent(list, entry(String(i)))
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, val: string) {
      if (JSON.parse(val).length > 1) throw new DOMException('full', 'QuotaExceededError')
      Object.defineProperty(this, k, { value: val, configurable: true, enumerable: true, writable: true })
    })
    const saved = saveRecent(list)
    spy.mockRestore()
    expect(saved.map((r) => r.payload)).toEqual(['2'])
  })
})

describe('presets', () => {
  it('apply visual settings but keep size, margin and logo', () => {
    const current = { ...DEFAULT_STYLE, size: 512, margin: 30, logo: 'data:x' }
    const ocean = PRESETS.find((p) => p.id === 'ocean')!
    const next = applyPreset(current, ocean)
    expect(next).toMatchObject({ size: 512, margin: 30, logo: 'data:x', fgColor: ocean.style.fgColor, gradient: true })
    expect(matchesPreset(next, ocean)).toBe(true)
  })
  it('can be modified after selection', () => {
    const ocean = PRESETS.find((p) => p.id === 'ocean')!
    const next = { ...applyPreset(DEFAULT_STYLE, ocean), fgColor: '#000000' }
    expect(next.fgColor).toBe('#000000')
    expect(matchesPreset(next, ocean)).toBe(false)
  })
  it('the default style matches the Classic preset', () => {
    expect(matchesPreset(DEFAULT_STYLE, PRESETS[0])).toBe(true)
  })
})
