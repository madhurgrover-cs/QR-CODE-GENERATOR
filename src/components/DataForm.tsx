import type { FieldErrors, FormValues, QRType, WifiEncryption } from '../lib/qrData'

interface Props {
  type: QRType
  values: FormValues
  errors: FieldErrors
  touched: Set<keyof FormValues>
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void
  onBlur: (key: keyof FormValues) => void
}

export function DataForm({ type, values, errors, touched, onChange, onBlur }: Props) {
  const err = (k: keyof FormValues) => (touched.has(k) ? errors[k] : undefined)

  const text = (k: keyof FormValues, label: string, opts: { placeholder?: string; type?: string; required?: boolean; multiline?: boolean; hint?: string; autoComplete?: string } = {}) => {
    const id = `f-${k}`
    const e = err(k)
    const common = {
      id,
      value: values[k] as string,
      placeholder: opts.placeholder,
      'aria-invalid': !!e,
      'aria-describedby': e ? `${id}-err` : opts.hint ? `${id}-hint` : undefined,
      onBlur: () => onBlur(k),
      onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(k, ev.target.value as never),
    }
    return (
      <div className={`field${e ? ' has-error' : ''}`}>
        <label htmlFor={id}>
          {label}
          {opts.required && <span className="req" aria-hidden> *</span>}
        </label>
        {opts.multiline ? (
          <textarea rows={4} {...common} />
        ) : (
          <input type={opts.type ?? 'text'} autoComplete={opts.autoComplete ?? 'off'} spellCheck={false} {...common} />
        )}
        {e ? (
          <p className="error" id={`${id}-err`} role="alert">{e}</p>
        ) : opts.hint ? (
          <p className="hint" id={`${id}-hint`}>{opts.hint}</p>
        ) : null}
      </div>
    )
  }

  switch (type) {
    case 'url':
      return text('url', 'Website URL', { placeholder: 'https://example.com', type: 'url', required: true, hint: 'https:// is added automatically if you leave it out.' })
    case 'text':
      return (
        <>
          {text('text', 'Text', { placeholder: 'Type anything…', required: true, multiline: true })}
          <p className="hint counter">{new TextEncoder().encode(values.text).length} bytes</p>
        </>
      )
    case 'email':
      return (
        <>
          {text('emailAddress', 'Email address', { placeholder: 'name@example.com', type: 'email', required: true })}
          {text('emailSubject', 'Subject', { placeholder: 'Optional' })}
          {text('emailBody', 'Message', { placeholder: 'Optional', multiline: true })}
        </>
      )
    case 'phone':
      return text('phone', 'Phone number', { placeholder: '+1 555 123 4567', type: 'tel', required: true, hint: 'Include the country code for international use.' })
    case 'wifi':
      return (
        <>
          {text('wifiSsid', 'Network name (SSID)', { placeholder: 'MyWiFi', required: true })}
          <div className="field">
            <label htmlFor="f-wifiEncryption">Security</label>
            <select
              id="f-wifiEncryption"
              value={values.wifiEncryption}
              onChange={(e) => onChange('wifiEncryption', e.target.value as WifiEncryption)}
            >
              <option value="WPA">WPA/WPA2/WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None (open network)</option>
            </select>
          </div>
          {values.wifiEncryption !== 'nopass' &&
            text('wifiPassword', 'Password', { type: 'text', required: true, autoComplete: 'off' })}
          <label className="check">
            <input type="checkbox" checked={values.wifiHidden} onChange={(e) => onChange('wifiHidden', e.target.checked)} />
            Hidden network
          </label>
        </>
      )
  }
}
