import qrcode from './qrcodeGen'
import { BYTE_CAPACITY, byteLength } from './qrData'
import type { QRStyle } from './style'

export type Severity = 'error' | 'warning' | 'info'
export interface Warning {
  id: string
  severity: Severity
  message: string
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Module count of the smallest QR version that fits the payload (same encoder settings as the renderer). */
export function moduleCount(payload: string, ec: QRStyle['ecLevel']): number {
  const qr = qrcode(0, ec)
  qr.addData(payload, 'Byte')
  qr.make()
  return qr.getModuleCount()
}

export function getWarnings(style: QRStyle, payload: string): Warning[] {
  const w: Warning[] = []
  const fgColors = style.gradient ? [style.fgColor, style.gradientColor] : [style.fgColor]
  const minContrast = Math.min(...fgColors.map((c) => contrastRatio(c, style.bgColor)))

  if (minContrast < 2.5)
    w.push({ id: 'contrast', severity: 'error', message: `Very low contrast (${minContrast.toFixed(1)}:1). Most scanners will fail — aim for at least 4:1.` })
  else if (minContrast < 4)
    w.push({ id: 'contrast', severity: 'warning', message: `Low contrast (${minContrast.toFixed(1)}:1). Some scanners may struggle — aim for at least 4:1.` })

  const fgLum = Math.max(...fgColors.map(relativeLuminance))
  if (fgLum > relativeLuminance(style.bgColor))
    w.push({ id: 'inverted', severity: 'warning', message: 'Foreground is lighter than the background (inverted). Many scanner apps can’t read inverted codes.' })

  if (payload) {
    const bytes = byteLength(payload)
    if (bytes > BYTE_CAPACITY[style.ecLevel]) {
      w.push({ id: 'capacity', severity: 'error', message: `Content is too long for error correction level ${style.ecLevel} (${bytes}/${BYTE_CAPACITY[style.ecLevel]} bytes). Shorten it or lower the level.` })
    } else {
      const modulePx = (style.size - 2 * style.margin) / moduleCount(payload, style.ecLevel)
      if (modulePx < 2)
        w.push({ id: 'density', severity: 'warning', message: 'The code is very dense for this size. Increase the size or shorten the content.' })
      if (style.margin < modulePx)
        w.push({ id: 'margin', severity: 'warning', message: 'The margin (quiet zone) is very small. Add some margin, especially if the code will sit on a busy background.' })
    }
  }

  if (style.size < 150)
    w.push({ id: 'size', severity: 'info', message: 'Small codes can be hard to scan when printed. Consider at least 200px.' })

  if (style.logo) {
    if (style.ecLevel === 'L' || style.ecLevel === 'M')
      w.push({ id: 'logo-ec', severity: 'warning', message: 'A logo hides part of the code. Use error correction Q or H so it stays readable.' })
    if (style.logoSize > 0.35)
      w.push({ id: 'logo-size', severity: 'warning', message: 'The logo is large and may cover too much of the code.' })
  }

  if (style.dotType === 'dots' || style.dotType === 'classy')
    w.push({ id: 'dots', severity: 'info', message: 'This dot style leaves gaps between modules; older scanners may read it less reliably.' })

  return w
}
