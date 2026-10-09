export type ECLevel = 'L' | 'M' | 'Q' | 'H'
export type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
export type CornerSquareType = 'square' | 'dot' | 'extra-rounded'
export type CornerDotType = 'square' | 'dot'

export interface QRStyle {
  size: number
  margin: number
  fgColor: string
  bgColor: string
  ecLevel: ECLevel
  dotType: DotType
  cornerSquareType: CornerSquareType
  cornerDotType: CornerDotType
  gradient: boolean
  gradientColor: string
  gradientType: 'linear' | 'radial'
  gradientRotation: number
  logo: string | null
  logoSize: number
}

export const DEFAULT_STYLE: QRStyle = {
  size: 300,
  margin: 16,
  fgColor: '#000000',
  bgColor: '#ffffff',
  ecLevel: 'M',
  dotType: 'square',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  gradient: false,
  gradientColor: '#4f46e5',
  gradientType: 'linear',
  gradientRotation: 45,
  logo: null,
  logoSize: 0.3,
}

export const SIZE_RANGE = { min: 100, max: 1000 }
export const MARGIN_RANGE = { min: 0, max: 80 }

export const EC_LEVELS: { id: ECLevel; label: string }[] = [
  { id: 'L', label: 'L – 7%' },
  { id: 'M', label: 'M – 15%' },
  { id: 'Q', label: 'Q – 25%' },
  { id: 'H', label: 'H – 30%' },
]

export const DOT_TYPES: { id: DotType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'extra-rounded', label: 'Extra rounded' },
  { id: 'dots', label: 'Dots' },
  { id: 'classy', label: 'Classy' },
  { id: 'classy-rounded', label: 'Classy rounded' },
]

export const CORNER_SQUARE_TYPES: { id: CornerSquareType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'extra-rounded', label: 'Rounded' },
  { id: 'dot', label: 'Circle' },
]

export const CORNER_DOT_TYPES: { id: CornerDotType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'dot', label: 'Circle' },
]

/** Presets only carry visual settings; size, margin and logo are kept from the current state. */
export type PresetStyle = Omit<QRStyle, 'size' | 'margin' | 'logo' | 'logoSize'>

export interface Preset {
  id: string
  name: string
  style: PresetStyle
}

const base: PresetStyle = {
  fgColor: '#000000',
  bgColor: '#ffffff',
  ecLevel: 'M',
  dotType: 'square',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  gradient: false,
  gradientColor: '#000000',
  gradientType: 'linear',
  gradientRotation: 45,
}

export const PRESETS: Preset[] = [
  { id: 'classic', name: 'Classic', style: base },
  {
    id: 'rounded',
    name: 'Soft',
    style: { ...base, fgColor: '#1f2937', dotType: 'rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    style: {
      ...base,
      fgColor: '#0c4a6e',
      bgColor: '#f0f9ff',
      dotType: 'extra-rounded',
      cornerSquareType: 'extra-rounded',
      cornerDotType: 'dot',
      gradient: true,
      gradientColor: '#0369a1',
      gradientRotation: 135,
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    style: {
      ...base,
      fgColor: '#9a3412',
      bgColor: '#fff7ed',
      ecLevel: 'Q',
      dotType: 'classy-rounded',
      cornerSquareType: 'extra-rounded',
      gradient: true,
      gradientColor: '#be123c',
      gradientRotation: 90,
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    style: { ...base, fgColor: '#14532d', bgColor: '#f0fdf4', dotType: 'classy', cornerSquareType: 'square' },
  },
  {
    id: 'dots',
    name: 'Dotty',
    style: {
      ...base,
      fgColor: '#4c1d95',
      ecLevel: 'Q',
      dotType: 'dots',
      cornerSquareType: 'dot',
      cornerDotType: 'dot',
      gradient: true,
      gradientColor: '#a21caf',
      gradientType: 'radial',
    },
  },
]

export function applyPreset(current: QRStyle, preset: Preset): QRStyle {
  return { ...current, ...preset.style }
}

export function matchesPreset(style: QRStyle, preset: Preset): boolean {
  return (Object.keys(preset.style) as (keyof PresetStyle)[]).every((k) => {
    // gradient colour/angle are irrelevant when gradients are off
    if (!preset.style.gradient && (k === 'gradientColor' || k === 'gradientType' || k === 'gradientRotation'))
      return true
    return style[k] === preset.style[k]
  })
}
