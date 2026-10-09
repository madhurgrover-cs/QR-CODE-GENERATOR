import qrcode from '../lib/qrcodeGen'
import jsQR from 'jsqr'


/** Encodes text into a QR matrix, rasterises it and decodes it back with jsQR. */
export function roundTrip(text: string, ec: 'L' | 'M' | 'Q' | 'H' = 'M', fg = [0, 0, 0], bg = [255, 255, 255]): string | null {
  const qr = qrcode(0, ec)
  qr.addData(text, 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  const scale = 4
  const quiet = 4
  const size = (n + quiet * 2) * scale
  const data = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.floor(y / scale) - quiet
      const c = Math.floor(x / scale) - quiet
      const dark = r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c)
      const [R, G, B] = dark ? fg : bg
      const i = (y * size + x) * 4
      data[i] = R
      data[i + 1] = G
      data[i + 2] = B
      data[i + 3] = 255
    }
  }
  return jsQR(data, size, size, { inversionAttempts: 'dontInvert' })?.data ?? null
}
