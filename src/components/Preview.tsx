import { useEffect, useRef, useState } from 'react'
import { createQR, verifyScannable } from '../lib/qrRenderer'
import type { QRStyle } from '../lib/style'

export type ScanStatus = 'idle' | 'checking' | 'ok' | 'fail'

interface Props {
  data: string | null
  style: QRStyle
  onScanStatus?: (s: ScanStatus) => void
}

export function Preview({ data, style, onScanStatus }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Result of the last decode check, tagged with what it checked so stale results read as "checking".
  const [result, setResult] = useState<{ data: string; style: QRStyle; ok: boolean } | null>(null)
  const scan: ScanStatus = !data ? 'idle' : result?.data === data && result.style === style ? (result.ok ? 'ok' : 'fail') : 'checking'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    if (!data) return
    createQR(data, style).append(el)
  }, [data, style])

  // Debounced decode check of the exact image that would be downloaded.
  useEffect(() => {
    if (!data) return
    let cancelled = false
    const t = setTimeout(() => {
      verifyScannable(data, style)
        .catch(() => false)
        .then((ok) => !cancelled && setResult({ data, style, ok }))
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [data, style])

  useEffect(() => onScanStatus?.(scan), [scan, onScanStatus])

  return (
    <div className="preview">
      <div className="preview-stage" style={{ background: data ? undefined : 'transparent' }}>
        <div ref={ref} className="qr-canvas" data-testid="qr-preview" aria-label={data ? 'QR code preview' : undefined} role={data ? 'img' : undefined} />
        {!data && (
          <div className="placeholder">
            <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden>
              <path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h3v3h-3v-3zm3 3h2v2h-2v-2zm-3 3h3v2h-3v-2zm5 0h3v2h-3v-2zm0-3h3v2h-3v-2z" />
            </svg>
            <p>Fill in the details to see your QR code</p>
          </div>
        )}
      </div>
      <p className="preview-meta">
        {style.size} × {style.size}px
        {data && (
          <span className={`scan-badge ${scan}`} role="status">
            {scan === 'checking' && 'Checking scannability…'}
            {scan === 'ok' && '✓ Verified scannable'}
            {scan === 'fail' && '✗ Could not be scanned'}
          </span>
        )}
      </p>
    </div>
  )
}
