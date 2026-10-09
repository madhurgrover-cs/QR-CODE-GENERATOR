import { useState } from 'react'
import { loadLogo } from '../lib/qrRenderer'
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
  EC_LEVELS,
  MARGIN_RANGE,
  PRESETS,
  SIZE_RANGE,
  matchesPreset,
  type QRStyle,
} from '../lib/style'

interface Props {
  style: QRStyle
  onChange: (patch: Partial<QRStyle>) => void
  onPreset: (id: string) => void
}

function ColorInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setDraft(value)
  }
  const valid = /^#[0-9a-f]{6}$/i.test(draft)
  return (
    <div className={`field color-field${valid ? '' : ' has-error'}`}>
      <label htmlFor={id}>{label}</label>
      <div className="color-row">
        <input type="color" aria-label={`${label} picker`} value={value} onChange={(e) => onChange(e.target.value)} />
        <input
          id={id}
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setDraft(v)
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase())
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
      {!valid && <p className="error">Use a hex colour like #1a2b3c.</p>}
    </div>
  )
}

function Range({ id, label, value, min, max, step = 1, unit = 'px', onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <output htmlFor={id}>{value}{unit}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function StylePanel({ style, onChange, onPreset }: Props) {
  const [logoError, setLogoError] = useState<string | null>(null)

  return (
    <div className="style-panel">
      <section>
        <h3>Presets</h3>
        <div className="presets">
          {PRESETS.map((p) => {
            const active = matchesPreset(style, p)
            const s = p.style
            return (
              <button key={p.id} type="button" className={`preset${active ? ' active' : ''}`} aria-pressed={active} onClick={() => onPreset(p.id)}>
                <span
                  className="swatch"
                  style={{
                    background: s.bgColor,
                    borderColor: s.fgColor,
                    color: s.fgColor,
                    backgroundImage: s.gradient ? `linear-gradient(135deg, ${s.fgColor} 0 45%, ${s.bgColor} 45% 55%, ${s.gradientColor} 55%)` : `linear-gradient(135deg, ${s.fgColor} 0 50%, ${s.bgColor} 50%)`,
                  }}
                />
                {p.name}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3>Size &amp; spacing</h3>
        <Range id="s-size" label="Size" value={style.size} min={SIZE_RANGE.min} max={SIZE_RANGE.max} step={10} onChange={(size) => onChange({ size })} />
        <Range id="s-margin" label="Margin" value={style.margin} min={MARGIN_RANGE.min} max={MARGIN_RANGE.max} onChange={(margin) => onChange({ margin })} />
      </section>

      <section>
        <h3>Colours</h3>
        <div className="grid-2">
          <ColorInput id="s-fg" label={style.gradient ? 'Foreground (start)' : 'Foreground'} value={style.fgColor} onChange={(fgColor) => onChange({ fgColor })} />
          <ColorInput id="s-bg" label="Background" value={style.bgColor} onChange={(bgColor) => onChange({ bgColor })} />
        </div>
        <button type="button" className="link" onClick={() => onChange({ fgColor: style.bgColor, bgColor: style.fgColor })}>
          ⇄ Swap colours
        </button>
        <label className="check">
          <input type="checkbox" checked={style.gradient} onChange={(e) => onChange({ gradient: e.target.checked })} />
          Gradient foreground
        </label>
        {style.gradient && (
          <div className="sub">
            <ColorInput id="s-grad" label="Gradient end" value={style.gradientColor} onChange={(gradientColor) => onChange({ gradientColor })} />
            <Segmented label="Gradient type" value={style.gradientType} options={[{ id: 'linear', label: 'Linear' }, { id: 'radial', label: 'Radial' }]} onChange={(gradientType) => onChange({ gradientType })} />
            {style.gradientType === 'linear' && (
              <Range id="s-rot" label="Angle" value={style.gradientRotation} min={0} max={360} step={5} unit="°" onChange={(gradientRotation) => onChange({ gradientRotation })} />
            )}
          </div>
        )}
      </section>

      <section>
        <h3>Error correction</h3>
        <Segmented label="Error correction level" value={style.ecLevel} options={EC_LEVELS} onChange={(ecLevel) => onChange({ ecLevel })} />
        <p className="hint">Higher levels survive damage and logos better but make the code denser.</p>
      </section>

      <section>
        <h3>Pattern</h3>
        <div className="field">
          <label htmlFor="s-dots">Dots</label>
          <select id="s-dots" value={style.dotType} onChange={(e) => onChange({ dotType: e.target.value as QRStyle['dotType'] })}>
            {DOT_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="s-cs">Corner frame</label>
            <select id="s-cs" value={style.cornerSquareType} onChange={(e) => onChange({ cornerSquareType: e.target.value as QRStyle['cornerSquareType'] })}>
              {CORNER_SQUARE_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-cd">Corner dot</label>
            <select id="s-cd" value={style.cornerDotType} onChange={(e) => onChange({ cornerDotType: e.target.value as QRStyle['cornerDotType'] })}>
              {CORNER_DOT_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h3>Logo</h3>
        {style.logo ? (
          <div className="logo-row">
            <img src={style.logo} alt="Uploaded logo" />
            <button type="button" className="btn ghost small" onClick={() => onChange({ logo: null })}>Remove logo</button>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="s-logo">Upload an image</label>
            <input
              id="s-logo"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  const logo = await loadLogo(file)
                  setLogoError(null)
                  // logos need headroom: bump error correction to H if it is lower
                  onChange({ logo, ecLevel: style.ecLevel === 'L' || style.ecLevel === 'M' ? 'H' : style.ecLevel })
                } catch (err) {
                  setLogoError((err as Error).message)
                }
              }}
            />
            {logoError && <p className="error" role="alert">{logoError}</p>}
          </div>
        )}
        {style.logo && (
          <Range id="s-logosize" label="Logo size" value={Math.round(style.logoSize * 100)} min={10} max={50} unit="%" onChange={(v) => onChange({ logoSize: v / 100 })} />
        )}
      </section>
    </div>
  )
}
