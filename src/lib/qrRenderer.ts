import QRCodeStyling, { type Options } from 'qr-code-styling'
import jsQR from 'jsqr'
import type { QRStyle } from './style'

export function buildOptions(data: string, style: QRStyle, type: 'canvas' | 'svg' = 'canvas'): Options {
  const gradient = style.gradient
    ? {
        type: style.gradientType,
        rotation: (style.gradientRotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: style.fgColor },
          { offset: 1, color: style.gradientColor },
        ],
      }
    : undefined
  return {
    type,
    width: style.size,
    height: style.size,
    margin: style.margin,
    data,
    image: style.logo ?? undefined,
    qrOptions: { errorCorrectionLevel: style.ecLevel, typeNumber: 0, mode: 'Byte' },
    imageOptions: { hideBackgroundDots: true, imageSize: style.logoSize, margin: 4, crossOrigin: 'anonymous' },
    dotsOptions: { type: style.dotType, color: style.fgColor, gradient },
    cornersSquareOptions: { type: style.cornerSquareType, color: style.fgColor, gradient },
    cornersDotOptions: { type: style.cornerDotType, color: style.fgColor, gradient },
    backgroundOptions: { color: style.bgColor },
  }
}

/**
 * A fresh instance per render: QRCodeStyling.update() deep-merges options, so
 * turning off a gradient or removing a logo would otherwise leave stale settings.
 */
export function createQR(data: string, style: QRStyle, type: 'canvas' | 'svg' = 'canvas') {
  return new QRCodeStyling(buildOptions(data, style, type))
}

export async function renderToBlob(data: string, style: QRStyle, ext: 'png' | 'svg' = 'png'): Promise<Blob> {
  const qr = createQR(data, style, ext === 'svg' ? 'svg' : 'canvas')
  const raw = await qr.getRawData(ext)
  if (!raw) throw new Error('Could not render QR code')
  return raw instanceof Blob ? raw : new Blob([new Uint8Array(raw)], { type: ext === 'svg' ? 'image/svg+xml' : 'image/png' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/** Decodes a rendered QR image. Returns the decoded text or null if unreadable. */
export function decodeImageData(img: ImageData): string | null {
  // dontInvert: mirror what typical phone scanners handle by default
  const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
  return result?.data ?? null
}

/** Renders the code exactly as it would be downloaded, then tries to scan it back. */
export async function verifyScannable(data: string, style: QRStyle): Promise<boolean> {
  const blob = await renderToBlob(data, style, 'png')
  const img = await blobToImageData(blob)
  return decodeImageData(img) === data
}

export async function makeThumbnail(data: string, style: QRStyle): Promise<string> {
  const blob = await renderToBlob(data, { ...style, size: 96, margin: Math.round((style.margin * 96) / style.size) })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Downscales an uploaded logo so it is small enough to keep in localStorage. */
export function loadLogo(file: File, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'))
    if (file.size > 5 * 1024 * 1024) return reject(new Error('Logo must be smaller than 5 MB.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be loaded.'))
    }
    img.src = url
  })
}
