import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataForm } from './components/DataForm'
import { Preview, type ScanStatus } from './components/Preview'
import { RecentList } from './components/RecentList'
import { StylePanel } from './components/StylePanel'
import { EMPTY_VALUES, FIELDS_BY_TYPE, QR_TYPES, buildPayload, describe, validate, type FormValues, type QRType } from './lib/qrData'
import { downloadBlob, makeThumbnail, renderToBlob } from './lib/qrRenderer'
import { getWarnings } from './lib/readability'
import { addRecent, loadRecent, loadTheme, saveRecent, saveTheme, type RecentQR, type Theme } from './lib/storage'
import { DEFAULT_STYLE, PRESETS, applyPreset, type QRStyle } from './lib/style'
import './App.css'

const canCopyImage = typeof navigator !== 'undefined' && !!navigator.clipboard && typeof ClipboardItem !== 'undefined'

export default function App() {
  const [type, setType] = useState<QRType>('url')
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [touched, setTouched] = useState<Set<keyof FormValues>>(new Set())
  const [style, setStyle] = useState<QRStyle>(DEFAULT_STYLE)
  const [recent, setRecent] = useState<RecentQR[]>(loadRecent)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [toast, setToast] = useState<string | null>(null)
  const [scan, setScan] = useState<ScanStatus>('idle')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const errors = useMemo(() => validate(type, values), [type, values])
  const isValid = Object.keys(errors).length === 0
  const payload = useMemo(() => (isValid ? buildPayload(type, values) : ''), [isValid, type, values])
  const warnings = useMemo(() => getWarnings(style, payload), [style, payload])
  const blocking = warnings.some((w) => w.severity === 'error' && w.id === 'capacity')
  const data = isValid && !blocking ? payload : null

  const onChange = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
  }, [])
  const onBlur = useCallback((key: keyof FormValues) => setTouched((t) => new Set(t).add(key)), [])
  const onStyle = useCallback((patch: Partial<QRStyle>) => setStyle((s) => ({ ...s, ...patch })), [])
  const onPreset = useCallback((id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (p) setStyle((s) => applyPreset(s, p))
  }, [])

  /** Returns true if ready; otherwise reveals all errors for the current type. */
  const ensureValid = () => {
    if (data) return true
    setTouched((t) => new Set([...t, ...FIELDS_BY_TYPE[type]]))
    setToast(isValid ? 'Fix the issues above before exporting.' : 'Please complete the highlighted fields.')
    return false
  }

  const remember = async () => {
    if (!data) return
    try {
      const thumbnail = await makeThumbnail(data, style)
      setRecent((list) => saveRecent(addRecent(list, { type, values, style, payload: data, label: describe(type, values), thumbnail })))
    } catch {
      /* thumbnail failure should not block the user's action */
    }
  }

  const fileName = () => `qr-${type}-${describe(type, values).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'code'}`

  const download = async (ext: 'png' | 'svg') => {
    if (!ensureValid() || !data) return
    try {
      const blob = await renderToBlob(data, style, ext)
      downloadBlob(blob, `${fileName()}.${ext}`)
      setToast(`Downloaded ${ext.toUpperCase()}`)
      remember()
    } catch {
      setToast('Download failed. Please try again.')
    }
  }

  const copy = async () => {
    if (!ensureValid() || !data) return
    try {
      const blob = await renderToBlob(data, style, 'png')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setToast('Copied image to clipboard')
      remember()
    } catch {
      setToast('Your browser blocked clipboard access.')
    }
  }

  const save = async () => {
    if (!ensureValid()) return
    await remember()
    setToast('Saved to recent')
  }

  const useRecent = (r: RecentQR) => {
    setType(r.type)
    setValues({ ...EMPTY_VALUES, ...r.values })
    setStyle({ ...DEFAULT_STYLE, ...r.style })
    setTouched(new Set())
    setToast('Loaded from recent')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setValues(EMPTY_VALUES)
    setStyle(DEFAULT_STYLE)
    setTouched(new Set())
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>▦</span>
          <h1>QR Designer</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn ghost small" onClick={reset}>Reset</button>
          <button
            type="button"
            className="icon-btn theme-toggle"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="col-left">
          <section className="card" aria-labelledby="content-h">
            <h2 id="content-h">Content</h2>
            <div className="tabs" role="tablist" aria-label="QR code type">
              {QR_TYPES.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={type === t.id} className={type === t.id ? 'active' : ''} onClick={() => setType(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <form className="data-form" onSubmit={(e) => { e.preventDefault(); download('png') }} noValidate>
              <DataForm type={type} values={values} errors={errors} touched={touched} onChange={onChange} onBlur={onBlur} />
            </form>
          </section>

          <section className="card" aria-labelledby="style-h">
            <h2 id="style-h">Design</h2>
            <StylePanel style={style} onChange={onStyle} onPreset={onPreset} />
          </section>
        </div>

        <div className="col-right">
          <section className="card sticky" aria-labelledby="preview-h">
            <h2 id="preview-h">Preview</h2>
            <Preview data={data} style={style} onScanStatus={setScan} />

            {(warnings.length > 0 || scan === 'fail') && (
              <ul className="warnings" aria-label="Readability warnings">
                {scan === 'fail' && data && (
                  <li className="error">Our scanner couldn’t read this design. Increase contrast, error correction or size, or simplify the style.</li>
                )}
                {warnings.map((w) => (
                  <li key={w.id} className={w.severity}>{w.message}</li>
                ))}
              </ul>
            )}

            <div className="actions">
              <button type="button" className="btn primary" onClick={() => download('png')}>Download PNG</button>
              <button type="button" className="btn" onClick={() => download('svg')}>SVG</button>
              {canCopyImage && <button type="button" className="btn" onClick={copy}>Copy</button>}
              <button type="button" className="btn" onClick={save}>Save</button>
            </div>
            {data && <p className="payload" title={data}><span>Encodes:</span> <code>{data}</code></p>}
          </section>

          <RecentList
            items={recent}
            onUse={useRecent}
            onRemove={(id) => setRecent((l) => saveRecent(l.filter((r) => r.id !== id)))}
            onClear={() => setRecent(saveRecent([]))}
          />
        </div>
      </main>

      <footer className="footer">Everything runs in your browser — nothing is uploaded.</footer>
      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
